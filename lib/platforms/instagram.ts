import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// Instagram Graph API (Instagram Login for business). Docs:
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
const AUTH_BASE = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
const ME_URL = "https://graph.instagram.com/v22.0/me";
const ME_FIELDS = "id,username,account_type,profile_picture_url";
// Meta renamed these — newer names use the "business" prefix.
// We only need basic profile + publishing; skip messages/comments/insights.
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
].join(",");

const GRAPH = "https://graph.instagram.com/v22.0";

export const instagramAdapter: PlatformAdapter = {
  id: "instagram",

  buildAuthUrl(state) {
    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId) throw new Error("INSTAGRAM_APP_ID not set");
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: getCallbackUrl("instagram"),
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code) {
    // Step 1: short-lived token
    const shortRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: getCallbackUrl("instagram"),
        code,
      }),
    });
    if (!shortRes.ok) {
      throw new Error(`Instagram short-lived token failed: ${await shortRes.text()}`);
    }
    const shortJson = await shortRes.json();
    const shortToken: string = shortJson.access_token;

    // Step 2: try to exchange for a long-lived token (60 days). Meta's endpoint has flipped
    // between GET and POST + permission behavior over time. Try both; if both fail, fall back
    // to the short-lived token (publishing still works for ~1 hour and user can reconnect).
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      access_token: shortToken,
    });

    let longJson: { access_token?: string; expires_in?: number } | null = null;

    // Try GET first (matches Meta's current documentation)
    try {
      const r = await fetch(`${LONG_LIVED_URL}?${longParams.toString()}`);
      if (r.ok) longJson = await r.json();
    } catch {
      // ignore
    }

    // If GET didn't work, try POST
    if (!longJson?.access_token) {
      try {
        const r = await fetch(LONG_LIVED_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: longParams,
        });
        if (r.ok) longJson = await r.json();
      } catch {
        // ignore
      }
    }

    if (longJson?.access_token) {
      return {
        access_token: longJson.access_token,
        refresh_token: longJson.access_token, // IG uses the access token itself to refresh
        expires_in: longJson.expires_in,
        scope: SCOPES,
      };
    }

    // Fallback: use the short-lived token. Works for ~1 hour; user reconnects after.
    console.warn("Instagram long-lived exchange failed; using short-lived token (1h validity)");
    return {
      access_token: shortToken,
      refresh_token: shortToken,
      expires_in: 3600,
      scope: SCOPES,
    };
  },

  async refresh(refreshToken) {
    const res = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Instagram refresh failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.access_token,
      expires_in: j.expires_in,
    };
  },

  async fetchProfile(accessToken) {
    // Meta keeps flipping endpoint methods. Try in order:
    //   1) GET with access_token query param (classic, still works on some endpoints)
    //   2) GET with Bearer header (newer style some endpoints prefer)
    //   3) POST with form body (what Meta returns "Unsupported request - method type: get" demands)
    const candidates: Array<() => Promise<Response>> = [
      () => fetch(`${ME_URL}?fields=${ME_FIELDS}&access_token=${encodeURIComponent(accessToken)}`),
      () => fetch(`${ME_URL}?fields=${ME_FIELDS}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      () => fetch(ME_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ fields: ME_FIELDS, access_token: accessToken }),
      }),
    ];

    let lastErr = "";
    for (const attempt of candidates) {
      try {
        const res = await attempt();
        if (res.ok) {
          const j = await res.json();
          return {
            id: String(j.id),
            username: j.username ?? null,
            avatar: j.profile_picture_url ?? null,
          };
        }
        lastErr = await res.text();
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    throw new Error(`Instagram profile failed (all methods): ${lastErr}`);
  },

  async publish({ accessToken, platformUserId, input }) {
    // Step 1: create media container
    const containerParams: Record<string, string> = {
      access_token: accessToken,
      caption: input.caption ?? "",
    };
    if (input.mediaType === "video") {
      containerParams.media_type = "REELS";
      containerParams.video_url = input.mediaUrl;
    } else {
      containerParams.image_url = input.mediaUrl;
    }
    const containerRes = await fetch(
      `${GRAPH}/${platformUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(containerParams),
      },
    );
    const containerJson = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(`Instagram container failed: ${JSON.stringify(containerJson)}`);
    }
    const creationId: string = containerJson.id;

    // Poll container status until FINISHED. Images usually process fast but
    // sometimes Meta returns "Media ID is not available" if you publish too soon.
    // Videos may take up to ~60s. Poll for both, but with different max waits.
    const maxPolls = input.mediaType === "video" ? 30 : 10;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      );
      const statusJson = await statusRes.json();
      if (statusJson.status_code === "FINISHED") break;
      if (statusJson.status_code === "ERROR")
        throw new Error(`Instagram container error: ${JSON.stringify(statusJson)}`);
    }

    // Step 2: publish
    const pubRes = await fetch(
      `${GRAPH}/${platformUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: accessToken,
          creation_id: creationId,
        }),
      },
    );
    const pubJson = await pubRes.json();
    if (!pubRes.ok) {
      throw new Error(`Instagram publish failed: ${JSON.stringify(pubJson)}`);
    }
    return {
      platformPostId: pubJson.id,
      platformPostUrl: null,
    };
  },
};

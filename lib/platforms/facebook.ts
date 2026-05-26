import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// Facebook Login + Pages API. Docs: https://developers.facebook.com/docs/pages-api
// Posts go to Facebook Pages (not personal profiles — Meta doesn't allow API posting to profiles).
//
// Flow:
//   1. OAuth → user access token (short-lived)
//   2. Exchange for long-lived user token (60 days)
//   3. GET /me/accounts → list of Pages the user manages + per-Page access tokens (don't expire)
//   4. Pick the first Page and store its ID + Page access token
//   5. Publish via /{page-id}/photos, /{page-id}/videos, or /{page-id}/feed

const GRAPH = "https://graph.facebook.com/v22.0";
const AUTH_BASE = "https://www.facebook.com/v22.0/dialog/oauth";
const TOKEN_URL = `${GRAPH}/oauth/access_token`;

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
].join(",");

export const facebookAdapter: PlatformAdapter = {
  id: "facebook",

  buildAuthUrl(state) {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error("FACEBOOK_APP_ID not set");
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: getCallbackUrl("facebook"),
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code) {
    // Step 1: short-lived user token
    const shortParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: getCallbackUrl("facebook"),
      code,
    });
    const shortRes = await fetch(`${TOKEN_URL}?${shortParams.toString()}`);
    if (!shortRes.ok) throw new Error(`Facebook token failed: ${await shortRes.text()}`);
    const shortJson = await shortRes.json();
    const shortToken: string = shortJson.access_token;

    // Step 2: exchange for long-lived user token (~60 days)
    const longParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      fb_exchange_token: shortToken,
    });
    const longRes = await fetch(`${TOKEN_URL}?${longParams.toString()}`);
    if (!longRes.ok) {
      throw new Error(`Facebook long-lived exchange failed: ${await longRes.text()}`);
    }
    const longJson = await longRes.json();
    const longUserToken: string = longJson.access_token;

    // Step 3: get the first Page + its (non-expiring) Page access token
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(longUserToken)}`,
    );
    if (!pagesRes.ok) {
      throw new Error(`Facebook /me/accounts failed: ${await pagesRes.text()}`);
    }
    const pagesJson = await pagesRes.json();
    const firstPage = pagesJson.data?.[0];
    if (!firstPage) {
      throw new Error(
        "No Facebook Pages found for this account. Create a Page first, then reconnect.",
      );
    }

    // We store the PAGE access token (not user token) — pages_manage_posts lets us post.
    return {
      access_token: firstPage.access_token,
      refresh_token: null, // Page tokens derived from long-lived user tokens don't expire.
      expires_in: null,
      scope: SCOPES,
    };
  },

  async fetchProfile(accessToken) {
    // accessToken here is the Page access token. /me on a Page token returns the Page itself.
    const res = await fetch(
      `${GRAPH}/me?fields=id,name,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) throw new Error(`Facebook profile failed: ${await res.text()}`);
    const j = await res.json();
    return {
      id: String(j.id),
      username: j.name ?? null,
      avatar: j.picture?.data?.url ?? null,
    };
  },

  async publish({ accessToken, platformUserId, input }) {
    const pageId = platformUserId;
    const params: Record<string, string> = {
      access_token: accessToken,
    };

    let endpoint: string;
    if (input.mediaType === "video") {
      endpoint = `${GRAPH}/${pageId}/videos`;
      params.file_url = input.mediaUrl;
      params.description = input.caption ?? "";
      if (input.title) params.title = input.title;
    } else {
      endpoint = `${GRAPH}/${pageId}/photos`;
      params.url = input.mediaUrl;
      params.caption = input.caption ?? "";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const j = await res.json();
    if (!res.ok) {
      throw new Error(`Facebook publish failed: ${JSON.stringify(j)}`);
    }
    // Videos return { id }, photos return { id, post_id }
    const postId: string = j.post_id ?? j.id;
    return {
      platformPostId: postId,
      platformPostUrl: `https://facebook.com/${postId}`,
    };
  },
};

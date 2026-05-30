import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// TikTok Content Posting API (v2). https://developers.tiktok.com/doc/content-posting-api-get-started
const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
// Only fields that user.info.basic scope grants. `username` would require
// user.info.profile scope and triggers "scope_not_authorized" if requested.
const USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name";
// Use the "Upload Content" / inbox endpoints instead of direct publish.
// Unaudited apps can't direct-post to public accounts ("unaudited_client_can_only_post_to_private_accounts").
// Inbox uploads land in the user's TikTok Inbox notifications — they tap publish inside the app.
// Once we get audited by TikTok, switch back to /v2/post/publish/{video,content}/init/ for true automation.
const PUBLISH_VIDEO_URL =
  "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
const PUBLISH_PHOTO_URL =
  "https://open.tiktokapis.com/v2/post/publish/content/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

const SCOPES = ["user.info.basic", "video.upload", "video.publish"].join(",");

export const tiktokAdapter: PlatformAdapter = {
  id: "tiktok",

  buildAuthUrl(state) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) throw new Error("TIKTOK_CLIENT_KEY not set");
    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: "code",
      scope: SCOPES,
      redirect_uri: getCallbackUrl("tiktok"),
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: getCallbackUrl("tiktok"),
      }),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_in: j.expires_in,
      scope: j.scope,
    };
  },

  async refresh(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`TikTok refresh failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_in: j.expires_in,
      scope: j.scope,
    };
  },

  async fetchProfile(accessToken) {
    const res = await fetch(USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`TikTok user info failed: ${await res.text()}`);
    const j = await res.json();
    const u = j.data?.user ?? {};
    return {
      id: u.open_id ?? u.union_id ?? "unknown",
      username: u.display_name ?? null,
      avatar: u.avatar_url ?? null,
    };
  },

  async publish({ accessToken, input }) {
    // Image path: TikTok photo carousel via Direct Post endpoint.
    // NOTE: unaudited apps may hit 'unaudited_client_can_only_post_to_private_accounts'
    // because TikTok has no inbox/draft equivalent for photos. Works after TikTok audit.
    if (input.mediaType === "image") {
      const photoRes = await fetch(PUBLISH_PHOTO_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: (input.title || "").slice(0, 90),
            description: (input.caption || "").slice(0, 2200),
            disable_comment: false,
            privacy_level: "SELF_ONLY", // safest for unaudited apps
            auto_add_music: true,
          },
          source_info: {
            source: "PULL_FROM_URL",
            photo_cover_index: 0,
            photo_images: [input.mediaUrl],
          },
          post_mode: "DIRECT_POST",
          media_type: "PHOTO",
        }),
      });
      const photoJson = await photoRes.json();
      if (!photoRes.ok || photoJson.error?.code !== "ok") {
        throw new Error(`TikTok photo publish failed: ${JSON.stringify(photoJson)}`);
      }
      return {
        platformPostId: photoJson.data?.publish_id ?? "pending",
        platformPostUrl: null,
      };
    }

    if (input.mediaType !== "video") {
      throw new Error("TikTok accepts video or image only");
    }
    // Inbox upload: no post_info needed — caption/privacy are set by the user
    // when they open the draft in the TikTok app.
    const initRes = await fetch(PUBLISH_VIDEO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        source_info: {
          source: "PULL_FROM_URL",
          video_url: input.mediaUrl,
        },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || initJson.error?.code !== "ok") {
      throw new Error(`TikTok publish init failed: ${JSON.stringify(initJson)}`);
    }
    const publishId: string = initJson.data?.publish_id;
    if (!publishId) {
      throw new Error(`TikTok did not return a publish_id: ${JSON.stringify(initJson)}`);
    }

    // Poll status until TikTok either delivers to inbox or fails.
    let lastStatus: string | undefined;
    let lastJson: unknown;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(STATUS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      });
      const statusJson = await statusRes.json();
      lastJson = statusJson;
      lastStatus = statusJson.data?.status as string | undefined;
      console.log(`[tiktok:${publishId}] poll #${i + 1} status=${lastStatus}`, statusJson);

      if (
        lastStatus === "SEND_TO_USER_INBOX" ||
        lastStatus === "PUBLISH_COMPLETE"
      ) {
        return { platformPostId: publishId, platformPostUrl: null };
      }
      if (lastStatus === "FAILED") {
        const reason = statusJson.data?.fail_reason ?? "unknown";
        throw new Error(`TikTok processing failed: ${reason}`);
      }
      // Otherwise keep polling (PROCESSING_DOWNLOAD, PROCESSING_UPLOAD, etc.)
    }
    // Timed out without a final state — report it as a failure so the user knows.
    throw new Error(
      `TikTok timed out at status=${lastStatus}; last response: ${JSON.stringify(lastJson)}`,
    );
  },
};

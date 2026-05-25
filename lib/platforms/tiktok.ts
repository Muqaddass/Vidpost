import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// TikTok Content Posting API (v2). https://developers.tiktok.com/doc/content-posting-api-get-started
const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username";
const PUBLISH_VIDEO_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";

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
      username: u.username ?? u.display_name ?? null,
      avatar: u.avatar_url ?? null,
    };
  },

  async publish({ accessToken, input }) {
    if (input.mediaType !== "video") {
      throw new Error("TikTok only accepts video uploads");
    }
    const res = await fetch(PUBLISH_VIDEO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: input.caption.slice(0, 2200),
          privacy_level: "SELF_ONLY", // creators upgrade in TikTok app; safe default
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: input.mediaUrl,
        },
      }),
    });
    const j = await res.json();
    if (!res.ok || j.error?.code !== "ok") {
      throw new Error(`TikTok publish failed: ${JSON.stringify(j)}`);
    }
    return {
      platformPostId: j.data?.publish_id ?? "pending",
      platformPostUrl: null,
    };
  },
};

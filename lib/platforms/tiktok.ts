import sharp from "sharp";
import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";
import { uploadToR2 } from "@/lib/r2";

/**
 * Fetches a possibly-PNG image from R2, converts it to JPEG, re-uploads to R2
 * with .jpg extension, and returns the new public URL. If it's already JPEG,
 * returns the original URL unchanged. TikTok rejects PNG photo posts.
 */
async function ensureJpegOnR2(mediaUrl: string): Promise<string> {
  // Quick path: not PNG, no work needed.
  const lower = mediaUrl.toLowerCase();
  if (!lower.endsWith(".png")) return mediaUrl;

  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`Could not fetch PNG from R2: ${res.status}`);
  const pngBuf = Buffer.from(await res.arrayBuffer());

  // Convert to JPEG. quality=90 is a good size/quality balance.
  const jpegBuf = await sharp(pngBuf).jpeg({ quality: 90 }).toBuffer();

  // Reuse the same path in R2, swap extension to .jpg
  const pathFromUrl = new URL(mediaUrl).pathname.replace(/^\//, "");
  const jpegKey = pathFromUrl.replace(/\.png$/i, ".jpg");

  const { publicUrl } = await uploadToR2({
    key: jpegKey,
    body: jpegBuf,
    contentType: "image/jpeg",
  });
  return publicUrl;
}

// TikTok Content Posting API (v2). https://developers.tiktok.com/doc/content-posting-api-get-started
const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
// Only fields that user.info.basic scope grants. `username` would require
// user.info.profile scope and triggers "scope_not_authorized" if requested.
const USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name";
// Direct Post (audited apps): video posts straight to user's TikTok profile.
// No manual review step in the user's TikTok app — true one-click publish.
const PUBLISH_VIDEO_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";
const PUBLISH_PHOTO_URL =
  "https://open.tiktokapis.com/v2/post/publish/content/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
// Required before direct post: returns the privacy levels this creator is allowed to use.
const CREATOR_INFO_URL =
  "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";

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
    // Image path: TikTok photo carousel via Direct Post endpoint (audit approved).
    if (input.mediaType === "image") {
      // TikTok rejects PNGs ("file_format_check_failed"). Convert on the fly.
      const photoMediaUrl = await ensureJpegOnR2(input.mediaUrl);
      console.log(`[tiktok:photo] using mediaUrl=${photoMediaUrl}`);
      // Query creator_info for allowed privacy levels.
      const creatorRes = await fetch(CREATOR_INFO_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      });
      const creatorJson = await creatorRes.json();
      const allowedPrivacy: string[] =
        creatorJson.data?.privacy_level_options ?? ["SELF_ONLY"];
      const privacyLevel =
        allowedPrivacy.find((p) => p === "PUBLIC_TO_EVERYONE") ??
        allowedPrivacy.find((p) => p === "MUTUAL_FOLLOW_FRIENDS") ??
        allowedPrivacy[0] ??
        "SELF_ONLY";
      console.log(
        `[tiktok:photo] creator_info allowed=${JSON.stringify(allowedPrivacy)} chosen=${privacyLevel}`,
      );

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
            privacy_level: privacyLevel,
            auto_add_music: true,
          },
          source_info: {
            source: "PULL_FROM_URL",
            photo_cover_index: 0,
            photo_images: [photoMediaUrl],
          },
          post_mode: "DIRECT_POST",
          media_type: "PHOTO",
        }),
      });
      const photoJson = await photoRes.json();
      console.log(`[tiktok:photo] init response:`, JSON.stringify(photoJson));
      if (!photoRes.ok || photoJson.error?.code !== "ok") {
        throw new Error(`TikTok photo publish failed: ${JSON.stringify(photoJson)}`);
      }
      const photoPublishId: string = photoJson.data?.publish_id;
      if (!photoPublishId) {
        throw new Error(`TikTok photo: no publish_id returned: ${JSON.stringify(photoJson)}`);
      }

      // Poll status — same as video. Without this we can't tell if TikTok's async
      // processing rejected the photo (often the case for unaudited photo posts).
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
          body: JSON.stringify({ publish_id: photoPublishId }),
        });
        const statusJson = await statusRes.json();
        lastJson = statusJson;
        lastStatus = statusJson.data?.status as string | undefined;
        console.log(`[tiktok:photo:${photoPublishId}] poll #${i + 1} status=${lastStatus}`);
        if (lastStatus === "PUBLISH_COMPLETE" || lastStatus === "SEND_TO_USER_INBOX") {
          return { platformPostId: photoPublishId, platformPostUrl: null };
        }
        if (lastStatus === "FAILED") {
          const reason = statusJson.data?.fail_reason ?? "unknown";
          throw new Error(`TikTok photo processing failed: ${reason}`);
        }
      }
      throw new Error(
        `TikTok photo timed out at status=${lastStatus}; last response: ${JSON.stringify(lastJson)}`,
      );
    }

    if (input.mediaType !== "video") {
      throw new Error("TikTok accepts video or image only");
    }

    // Direct Post requires querying creator_info first to get the privacy_level options
    // allowed for this account. TikTok rejects the publish if we pass an unsupported value.
    const creatorRes = await fetch(CREATOR_INFO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    });
    const creatorJson = await creatorRes.json();
    const allowedPrivacy: string[] =
      creatorJson.data?.privacy_level_options ?? ["SELF_ONLY"];
    // Pick the most public option available (PUBLIC_TO_EVERYONE > MUTUAL_FOLLOW_FRIENDS > SELF_ONLY).
    const privacyLevel =
      allowedPrivacy.find((p) => p === "PUBLIC_TO_EVERYONE") ??
      allowedPrivacy.find((p) => p === "MUTUAL_FOLLOW_FRIENDS") ??
      allowedPrivacy[0] ??
      "SELF_ONLY";

    const initRes = await fetch(PUBLISH_VIDEO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: (input.caption || "").slice(0, 2200),
          privacy_level: privacyLevel,
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

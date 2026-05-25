import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// LinkedIn — OpenID Connect for user identity + UGC Posts for content.
const AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const REGISTER_UPLOAD = "https://api.linkedin.com/v2/assets?action=registerUpload";
const UGC_POSTS = "https://api.linkedin.com/v2/ugcPosts";

const SCOPES = ["openid", "profile", "email", "w_member_social"].join(" ");

export const linkedinAdapter: PlatformAdapter = {
  id: "linkedin",

  buildAuthUrl(state) {
    const id = process.env.LINKEDIN_CLIENT_ID;
    if (!id) throw new Error("LINKEDIN_CLIENT_ID not set");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: id,
      redirect_uri: getCallbackUrl("linkedin"),
      scope: SCOPES,
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getCallbackUrl("linkedin"),
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn token failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? null,
      expires_in: j.expires_in,
      scope: j.scope,
    };
  },

  async refresh(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn refresh failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? refreshToken,
      expires_in: j.expires_in,
    };
  },

  async fetchProfile(accessToken) {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`LinkedIn userinfo failed: ${await res.text()}`);
    const j = await res.json();
    return {
      id: j.sub,
      username: j.name ?? null,
      avatar: j.picture ?? null,
    };
  },

  async publish({ accessToken, platformUserId, input }) {
    const authorUrn = `urn:li:person:${platformUserId}`;

    if (input.mediaType === "image" || input.mediaType === "video") {
      // 1. Register upload
      const recipe =
        input.mediaType === "video"
          ? "urn:li:digitalmediaRecipe:feedshare-video"
          : "urn:li:digitalmediaRecipe:feedshare-image";

      const regRes = await fetch(REGISTER_UPLOAD, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: [recipe],
            owner: authorUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      });
      const regJson = await regRes.json();
      if (!regRes.ok)
        throw new Error(`LinkedIn registerUpload failed: ${JSON.stringify(regJson)}`);

      const uploadUrl: string =
        regJson.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].uploadUrl;
      const asset: string = regJson.value.asset;

      // 2. Upload bytes
      const fileRes = await fetch(input.mediaUrl);
      if (!fileRes.ok) throw new Error(`Could not fetch media from R2`);
      const buf = await fileRes.arrayBuffer();
      const upRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: buf,
      });
      if (!upRes.ok) throw new Error(`LinkedIn asset upload failed: ${await upRes.text()}`);

      // 3. Create UGC post
      const postRes = await fetch(UGC_POSTS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: input.caption ?? "" },
              shareMediaCategory: input.mediaType === "video" ? "VIDEO" : "IMAGE",
              media: [
                {
                  status: "READY",
                  media: asset,
                  title: { text: input.title ?? "" },
                },
              ],
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      });
      const postJson = await postRes.json();
      if (!postRes.ok)
        throw new Error(`LinkedIn ugcPost failed: ${JSON.stringify(postJson)}`);
      return { platformPostId: postJson.id, platformPostUrl: null };
    }

    throw new Error("Unsupported media type for LinkedIn");
  },
};

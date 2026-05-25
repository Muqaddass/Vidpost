import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// Pinterest API v5. https://developers.pinterest.com/docs/api/v5/
const AUTH_BASE = "https://www.pinterest.com/oauth/";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const USER_URL = "https://api.pinterest.com/v5/user_account";
const BOARDS_URL = "https://api.pinterest.com/v5/boards";
const PINS_URL = "https://api.pinterest.com/v5/pins";

const SCOPES = "boards:read,pins:read,pins:write";

function basicAuth() {
  const id = process.env.PINTEREST_APP_ID;
  const secret = process.env.PINTEREST_APP_SECRET;
  if (!id || !secret) throw new Error("PINTEREST_APP_ID/SECRET not set");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export const pinterestAdapter: PlatformAdapter = {
  id: "pinterest",

  buildAuthUrl(state) {
    const id = process.env.PINTEREST_APP_ID;
    if (!id) throw new Error("PINTEREST_APP_ID not set");
    const params = new URLSearchParams({
      client_id: id,
      redirect_uri: getCallbackUrl("pinterest"),
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getCallbackUrl("pinterest"),
      }),
    });
    if (!res.ok) throw new Error(`Pinterest token failed: ${await res.text()}`);
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
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Pinterest refresh failed: ${await res.text()}`);
    const j = await res.json();
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? refreshToken,
      expires_in: j.expires_in,
    };
  },

  async fetchProfile(accessToken) {
    const res = await fetch(USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Pinterest user failed: ${await res.text()}`);
    const j = await res.json();
    return {
      id: j.username,
      username: j.username,
      avatar: j.profile_image ?? null,
    };
  },

  async publish({ accessToken, input }) {
    // Pinterest pins need a board. Pick the user's first board for v1.
    const boardsRes = await fetch(`${BOARDS_URL}?page_size=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const boardsJson = await boardsRes.json();
    const boardId = boardsJson.items?.[0]?.id;
    if (!boardId) throw new Error("No Pinterest board found for this account");

    const body: Record<string, unknown> = {
      board_id: boardId,
      title: (input.title || input.caption || "").slice(0, 100),
      description: input.caption ?? "",
      media_source:
        input.mediaType === "video"
          ? { source_type: "video_url", url: input.mediaUrl, cover_image_url: input.mediaUrl }
          : { source_type: "image_url", url: input.mediaUrl },
    };

    const res = await fetch(PINS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`Pinterest pin failed: ${JSON.stringify(j)}`);
    return {
      platformPostId: j.id,
      platformPostUrl: `https://pinterest.com/pin/${j.id}`,
    };
  },
};

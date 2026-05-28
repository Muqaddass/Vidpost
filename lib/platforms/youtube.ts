import { Readable } from "node:stream";
import { google } from "googleapis";
import type { PlatformAdapter } from "./types";
import { getCallbackUrl } from "./config";

// YouTube Data API v3 — upload via googleapis OAuth2 client.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

function oauthClient() {
  const id = process.env.YOUTUBE_CLIENT_ID;
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("YOUTUBE_CLIENT_ID/SECRET not set");
  return new google.auth.OAuth2(id, secret, getCallbackUrl("youtube"));
}

export const youtubeAdapter: PlatformAdapter = {
  id: "youtube",

  buildAuthUrl(state) {
    return oauthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // ensures refresh_token on every grant
      scope: SCOPES,
      state,
    });
  },

  async exchangeCode(code) {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    const expiresIn = tokens.expiry_date
      ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
      : null;
    return {
      access_token: tokens.access_token ?? "",
      refresh_token: tokens.refresh_token ?? null,
      expires_in: expiresIn,
      scope: tokens.scope ?? null,
    };
  },

  async refresh(refreshToken) {
    const client = oauthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    const expiresIn = credentials.expiry_date
      ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
      : null;
    return {
      access_token: credentials.access_token ?? "",
      // Google may or may not return a new refresh_token — keep the old one if not present.
      refresh_token: credentials.refresh_token ?? refreshToken,
      expires_in: expiresIn,
    };
  },

  async fetchProfile(accessToken) {
    const client = oauthClient();
    client.setCredentials({ access_token: accessToken });
    const yt = google.youtube({ version: "v3", auth: client });
    const res = await yt.channels.list({ part: ["snippet"], mine: true });
    const ch = res.data.items?.[0];
    return {
      id: ch?.id ?? "unknown",
      username: ch?.snippet?.title ?? null,
      avatar: ch?.snippet?.thumbnails?.default?.url ?? null,
    };
  },

  async publish({ accessToken, input }) {
    if (input.mediaType !== "video") {
      throw new Error("YouTube only accepts video uploads");
    }
    const client = oauthClient();
    client.setCredentials({ access_token: accessToken });
    const yt = google.youtube({ version: "v3", auth: client });

    // Stream the video from R2 directly through to YouTube
    const upstream = await fetch(input.mediaUrl);
    if (!upstream.ok || !upstream.body) {
      throw new Error(`Failed to fetch media from R2: ${upstream.status}`);
    }

    // googleapis expects a Node Readable, but fetch() returns a Web ReadableStream.
    // Readable.fromWeb() bridges the two.
    const nodeStream = Readable.fromWeb(
      upstream.body as unknown as import("node:stream/web").ReadableStream,
    );

    const res = await yt.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: (input.title || input.caption || "Untitled").slice(0, 100),
          description: input.caption ?? "",
        },
        status: { privacyStatus: "private" }, // safer default; user can flip in YT studio
      },
      media: {
        mimeType: upstream.headers.get("content-type") ?? "video/mp4",
        body: nodeStream,
      },
    });

    const videoId = res.data.id ?? "";
    return {
      platformPostId: videoId,
      platformPostUrl: videoId ? `https://youtu.be/${videoId}` : null,
    };
  },
};

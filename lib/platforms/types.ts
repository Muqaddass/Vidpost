import type { Platform } from "@/lib/types/database";

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string | null;
  /** Seconds until access_token expires, if known. */
  expires_in?: number | null;
  scope?: string | null;
}

export interface PlatformProfile {
  id: string;
  username: string | null;
  avatar: string | null;
}

export interface PublishInput {
  mediaUrl: string;
  mediaType: "video" | "image";
  caption: string;
  title?: string;
}

export interface PublishResult {
  platformPostId: string;
  platformPostUrl?: string | null;
}

export interface PlatformAdapter {
  id: Platform;
  buildAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  fetchProfile(accessToken: string): Promise<PlatformProfile>;
  refresh?(refreshToken: string): Promise<OAuthTokens>;
  publish(args: { accessToken: string; platformUserId: string; input: PublishInput }): Promise<PublishResult>;
}

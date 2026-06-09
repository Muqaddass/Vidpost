import type { Platform } from "@/lib/types/database";

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string | null;
  /** Seconds until access_token expires, if known. */
  expires_in?: number | null;
  scope?: string | null;
  /**
   * Optional: profile pre-fetched during token exchange.
   * Useful when the same response that issues the token also contains the
   * platform user_id (Instagram, etc.) — avoids a separate /me call that may
   * not work for all users in development mode.
   */
  profile?: PlatformProfile;
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
  publish(args: {
    accessToken: string;
    /** Optional refresh token — used by YouTube (Google) to auto-renew expired access tokens. */
    refreshToken?: string | null;
    platformUserId: string;
    input: PublishInput;
  }): Promise<PublishResult>;
}

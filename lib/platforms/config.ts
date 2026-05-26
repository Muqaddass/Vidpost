import type { Platform } from "@/lib/types/database";

export interface PlatformMeta {
  id: Platform;
  name: string;
  brandColor: string;
  blurb: string;
  acceptsVideo: boolean;
  acceptsImage: boolean;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    brandColor: "#FE2C55",
    blurb: "Short-form video for the For You feed.",
    acceptsVideo: true,
    acceptsImage: false,
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    brandColor: "#E1306C",
    blurb: "Reels, posts, and stories on Instagram.",
    acceptsVideo: true,
    acceptsImage: true,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    brandColor: "#FF0000",
    blurb: "Upload videos and Shorts to your channel.",
    acceptsVideo: true,
    acceptsImage: false,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    brandColor: "#0A66C2",
    blurb: "Share with your professional network.",
    acceptsVideo: true,
    acceptsImage: true,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    brandColor: "#E60023",
    blurb: "Create pins that drive long-tail traffic.",
    acceptsVideo: true,
    acceptsImage: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    brandColor: "#1877F2",
    blurb: "Post to a Facebook Page you manage.",
    acceptsVideo: true,
    acceptsImage: true,
  },
};

export const PLATFORM_LIST: PlatformMeta[] = Object.values(PLATFORMS);

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getCallbackUrl(platform: Platform): string {
  return `${getAppUrl()}/api/auth/${platform}/callback`;
}

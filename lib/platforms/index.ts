import type { Platform } from "@/lib/types/database";
import type { PlatformAdapter } from "./types";
import { tiktokAdapter } from "./tiktok";
import { instagramAdapter } from "./instagram";
import { youtubeAdapter } from "./youtube";
import { linkedinAdapter } from "./linkedin";
import { pinterestAdapter } from "./pinterest";

export const adapters: Record<Platform, PlatformAdapter> = {
  tiktok: tiktokAdapter,
  instagram: instagramAdapter,
  youtube: youtubeAdapter,
  linkedin: linkedinAdapter,
  pinterest: pinterestAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const a = adapters[platform];
  if (!a) throw new Error(`No adapter for platform: ${platform}`);
  return a;
}

export type { PlatformAdapter } from "./types";

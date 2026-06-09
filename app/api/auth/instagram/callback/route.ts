import { handleOAuthCallback } from "@/lib/oauth-handlers";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
// Profile fetch fallbacks + token exchange can take ~15s. Default 10s isn't enough.
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  return handleOAuthCallback("instagram", req);
}

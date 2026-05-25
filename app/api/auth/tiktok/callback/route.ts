import { handleOAuthCallback } from "@/lib/oauth-handlers";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  return handleOAuthCallback("tiktok", req);
}

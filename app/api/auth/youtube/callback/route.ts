import { handleOAuthCallback } from "@/lib/oauth-handlers";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  return handleOAuthCallback("youtube", req);
}

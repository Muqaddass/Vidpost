import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { bearerFromHeader, verifyApiKey } from "@/lib/api-keys";
import { publishForUser } from "@/lib/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin", "pinterest", "facebook"] as const;

const schema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().max(5000).default(""),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["video", "image"]).default("image"),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
});

/**
 * Machine-to-machine publish endpoint. Authenticated by a VidPost API key
 * (Authorization: Bearer vp_...), not a session cookie. Posts on behalf of the
 * key's owner using their connected accounts. Used by the Amazon affiliate
 * engine (and any other trusted caller).
 */
export async function POST(req: NextRequest) {
  const userId = await verifyApiKey(bearerFromHeader(req.headers.get("authorization")));
  if (!userId) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const outcome = await publishForUser(userId, body);
    return NextResponse.json(outcome);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish_failed" },
      { status: 500 },
    );
  }
}

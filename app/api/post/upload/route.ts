import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getR2PresignedPutUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns a presigned PUT URL the browser uploads to directly.
// Avoids Vercel Hobby's 4.5 MB serverless payload limit.

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const ALLOWED = new Set([
  "video/mp4",
  "video/quicktime",
  "video/mov",
  "image/jpeg",
  "image/png",
]);

const schema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (body.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", limit: MAX_BYTES }, { status: 413 });
  }
  if (!ALLOWED.has(body.contentType)) {
    return NextResponse.json(
      { error: "unsupported_type", type: body.contentType },
      { status: 415 },
    );
  }

  const ext = body.fileName.includes(".") ? body.fileName.split(".").pop() : "bin";
  const key = `${user.id}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  const { uploadUrl, publicUrl } = await getR2PresignedPutUrl({
    key,
    contentType: body.contentType,
  });

  const mediaType: "video" | "image" = body.contentType.startsWith("video/")
    ? "video"
    : "image";

  return NextResponse.json({ uploadUrl, publicUrl, key, mediaType });
}

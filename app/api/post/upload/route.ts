import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow up to 500 MB uploads (per spec); raise on Vercel via deployment config if needed.
export const maxDuration = 60;

const MAX_BYTES = 500 * 1024 * 1024;

const ALLOWED = new Set([
  "video/mp4",
  "video/quicktime",
  "video/mov",
  "image/jpeg",
  "image/png",
]);

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported_type", type: file.type },
      { status: 415 },
    );
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `${user.id}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { publicUrl } = await uploadToR2({
    key,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  const mediaType: "video" | "image" = file.type.startsWith("video/")
    ? "video"
    : "image";

  return NextResponse.json({ url: publicUrl, key, mediaType, size: file.size });
}

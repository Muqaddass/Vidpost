import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encrypt";
import { getAdapter } from "@/lib/platforms";
import type { Platform } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin", "pinterest"] as const;

const schema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().max(5000).default(""),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["video", "image"]),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
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

  const admin = getSupabaseAdmin();

  // 1. Create post row
  const { data: post, error: insertErr } = await admin
    .from("posts")
    .insert({
      user_id: user.id,
      title: body.title ?? null,
      caption: body.caption,
      media_url: body.mediaUrl,
      media_type: body.mediaType,
      platforms: body.platforms as Platform[],
      status: "publishing",
    })
    .select()
    .single();
  if (insertErr || !post) {
    return NextResponse.json(
      { error: insertErr?.message ?? "post_insert_failed" },
      { status: 500 },
    );
  }

  // 2. Load all relevant connected accounts in one query
  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .in("platform", body.platforms);

  const accountByPlatform = new Map<Platform, NonNullable<typeof accounts>[number]>();
  for (const a of accounts ?? []) accountByPlatform.set(a.platform, a);

  // 3. Fan out — sequential so a slow upload doesn't burn rate limits
  const results: { platform: Platform; ok: boolean; id?: string; error?: string }[] = [];

  for (const platform of body.platforms) {
    const acct = accountByPlatform.get(platform);
    if (!acct) {
      results.push({ platform, ok: false, error: "not_connected" });
      await admin.from("post_results").insert({
        post_id: post.id,
        platform,
        status: "failed",
        error_message: "Account not connected",
      });
      continue;
    }

    try {
      const accessToken = decrypt(acct.access_token);
      const adapter = getAdapter(platform);
      const r = await adapter.publish({
        accessToken,
        platformUserId: acct.platform_user_id,
        input: {
          mediaUrl: body.mediaUrl,
          mediaType: body.mediaType,
          caption: body.caption,
          title: body.title,
        },
      });
      results.push({ platform, ok: true, id: r.platformPostId });
      await admin.from("post_results").insert({
        post_id: post.id,
        platform,
        status: "success",
        platform_post_id: r.platformPostId,
        platform_post_url: r.platformPostUrl ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown_error";
      console.error(`[publish:${platform}]`, msg);
      results.push({ platform, ok: false, error: msg });
      await admin.from("post_results").insert({
        post_id: post.id,
        platform,
        status: "failed",
        error_message: msg.slice(0, 1000),
      });
    }
  }

  const anyOk = results.some((r) => r.ok);
  const allOk = results.every((r) => r.ok);
  const finalStatus = allOk ? "published" : anyOk ? "published" : "failed";

  await admin
    .from("posts")
    .update({
      status: finalStatus,
      published_at: anyOk ? new Date().toISOString() : null,
    })
    .eq("id", post.id);

  return NextResponse.json({ postId: post.id, status: finalStatus, results });
}

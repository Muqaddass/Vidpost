import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encrypt";
import { getAdapter } from "@/lib/platforms";
import type { Platform } from "@/lib/types/database";

export interface PublishRequest {
  title?: string;
  caption: string;
  mediaUrl: string;
  mediaType: "video" | "image";
  platforms: Platform[];
}

export interface PublishOutcome {
  postId: string;
  status: "published" | "failed";
  results: { platform: Platform; ok: boolean; id?: string; error?: string }[];
}

/**
 * Core publish fan-out, shared by the session route (/api/post/publish) and the
 * machine-to-machine API (/api/v1/publish). Posts a single piece of media +
 * caption to each requested platform using the user's connected accounts.
 */
export async function publishForUser(
  userId: string,
  body: PublishRequest,
): Promise<PublishOutcome> {
  const admin = getSupabaseAdmin();

  const { data: post, error: insertErr } = await admin
    .from("posts")
    .insert({
      user_id: userId,
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
    throw new Error(insertErr?.message ?? "post_insert_failed");
  }

  const { data: accounts } = await admin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .in("platform", body.platforms);

  const accountByPlatform = new Map<Platform, NonNullable<typeof accounts>[number]>();
  for (const a of accounts ?? []) accountByPlatform.set(a.platform, a);

  const results: PublishOutcome["results"] = [];

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
      const refreshToken = acct.refresh_token ? decrypt(acct.refresh_token) : null;
      const r = await getAdapter(platform).publish({
        accessToken,
        refreshToken,
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
  const status: "published" | "failed" = anyOk ? "published" : "failed";

  await admin
    .from("posts")
    .update({
      status,
      published_at: anyOk ? new Date().toISOString() : null,
    })
    .eq("id", post.id);

  return { postId: post.id, status, results };
}

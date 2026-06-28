import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/encrypt";
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
      const adapter = getAdapter(platform);
      let accessToken = decrypt(acct.access_token);
      let refreshToken = acct.refresh_token ? decrypt(acct.refresh_token) : null;

      // Refresh the access token if it's expired/near-expiry (TikTok tokens last
      // only ~24h). Persist the new tokens so the next post is fresh too.
      const expMs = acct.token_expires_at ? Date.parse(acct.token_expires_at) : null;
      const nearExpiry = expMs !== null && expMs < Date.now() + 120_000;
      if (nearExpiry && refreshToken && adapter.refresh) {
        try {
          const t = await adapter.refresh(refreshToken);
          accessToken = t.access_token;
          refreshToken = t.refresh_token ?? refreshToken;
          await admin
            .from("connected_accounts")
            .update({
              access_token: encrypt(accessToken),
              refresh_token: refreshToken ? encrypt(refreshToken) : acct.refresh_token,
              token_expires_at: t.expires_in
                ? new Date(Date.now() + t.expires_in * 1000).toISOString()
                : acct.token_expires_at,
              updated_at: new Date().toISOString(),
            })
            .eq("id", acct.id);
        } catch (re) {
          console.error(`[publish:${platform}] refresh failed`, re);
        }
      }

      let r;
      try {
        r = await adapter.publish({
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
      } catch (pubErr) {
        // Retry once if it failed due to an invalid/expired access token.
        const m = pubErr instanceof Error ? pubErr.message : String(pubErr);
        if (refreshToken && adapter.refresh && /access_token_invalid|invalid.*token|expired/i.test(m)) {
          const t = await adapter.refresh(refreshToken);
          accessToken = t.access_token;
          refreshToken = t.refresh_token ?? refreshToken;
          await admin
            .from("connected_accounts")
            .update({
              access_token: encrypt(accessToken),
              refresh_token: refreshToken ? encrypt(refreshToken) : acct.refresh_token,
              token_expires_at: t.expires_in
                ? new Date(Date.now() + t.expires_in * 1000).toISOString()
                : acct.token_expires_at,
              updated_at: new Date().toISOString(),
            })
            .eq("id", acct.id);
          r = await adapter.publish({
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
        } else {
          throw pubErr;
        }
      }
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

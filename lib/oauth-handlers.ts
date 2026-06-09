import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/platforms";
import {
  setOAuthState,
  verifyOAuthState,
  signUserIdForBounce,
  verifyBounceUserId,
} from "@/lib/oauth-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encrypt";
import { getAppUrl } from "@/lib/platforms/config";
import type { Platform } from "@/lib/types/database";

export async function startOAuth(platform: Platform, req?: NextRequest) {
  // Cross-domain bounce: when the override origin differs from the current app origin,
  // we get bounced here with ?_uid=<userId>&_sig=<sig> instead of a Supabase session
  // cookie (cookies are domain-scoped). Verify the signed user_id and use it.
  let userId: string | null = null;
  if (req) {
    const url = new URL(req.url);
    const uidParam = url.searchParams.get("_uid");
    const sigParam = url.searchParams.get("_sig");
    if (uidParam && sigParam) {
      userId = verifyBounceUserId(uidParam, sigParam);
      if (!userId) {
        return NextResponse.redirect(
          `${getAppUrl()}/dashboard/connect?error=invalid_bounce`,
        );
      }
    }
  }

  // Fallback: get user from Supabase session (normal same-origin flow).
  if (!userId) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${getAppUrl()}/login?next=/dashboard/connect`);
    }
    userId = user.id;

    // If override targets a different origin, bounce there with signed user_id
    // so the state cookie ends up on the same origin as the eventual callback.
    const override = process.env[`${platform.toUpperCase()}_REDIRECT_URI`];
    if (override) {
      try {
        const overrideOrigin = new URL(override).origin;
        const currentOrigin = getAppUrl();
        if (overrideOrigin !== currentOrigin) {
          const sig = signUserIdForBounce(user.id);
          const params = new URLSearchParams({ _uid: user.id, _sig: sig });
          return NextResponse.redirect(
            `${overrideOrigin}/api/auth/${platform}?${params.toString()}`,
          );
        }
      } catch {
        // Malformed override URL — fall through to normal flow.
      }
    }
  }

  // userId is non-null here: either set from the bounce params at the top,
  // or set from the Supabase session above (we return early if no user).
  const state = await setOAuthState(platform, userId!);
  const url = getAdapter(platform).buildAuthUrl(state);
  return NextResponse.redirect(url);
}

export async function handleOAuthCallback(platform: Platform, req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const connectPage = `${getAppUrl()}/dashboard/connect`;

  if (error) {
    return NextResponse.redirect(
      `${connectPage}?error=${encodeURIComponent(`${platform}: ${error}`)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${connectPage}?error=missing_code`);
  }

  const verification = await verifyOAuthState(platform, state);
  if (!verification.ok || !verification.userId) {
    return NextResponse.redirect(`${connectPage}?error=invalid_state`);
  }
  const userId = verification.userId;

  try {
    const adapter = getAdapter(platform);
    const tokens = await adapter.exchangeCode(code);
    // If the token exchange already produced profile info (e.g. Instagram, which
    // returns user_id alongside the token), skip the separate fetchProfile call.
    const profile = tokens.profile ?? (await adapter.fetchProfile(tokens.access_token));

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const admin = getSupabaseAdmin();
    const { error: upsertError } = await admin
      .from("connected_accounts")
      .upsert(
        {
          user_id: userId,
          platform,
          platform_user_id: profile.id,
          platform_username: profile.username,
          platform_avatar: profile.avatar,
          access_token: encrypt(tokens.access_token),
          refresh_token: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : null,
          token_expires_at: expiresAt,
          scope: tokens.scope ?? null,
        },
        { onConflict: "user_id,platform" },
      );

    if (upsertError) throw upsertError;

    return NextResponse.redirect(`${connectPage}?connected=${platform}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error(`[oauth:${platform}]`, msg);
    return NextResponse.redirect(
      `${connectPage}?error=${encodeURIComponent(msg.slice(0, 200))}`,
    );
  }
}

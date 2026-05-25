import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/platforms";
import { setOAuthState, verifyOAuthState } from "@/lib/oauth-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encrypt";
import { getAppUrl } from "@/lib/platforms/config";
import type { Platform } from "@/lib/types/database";

export async function startOAuth(platform: Platform) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login?next=/dashboard/connect`);
  }
  const state = await setOAuthState(platform);
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

  const stateOk = await verifyOAuthState(platform, state);
  if (!stateOk) {
    return NextResponse.redirect(`${connectPage}?error=invalid_state`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login`);
  }

  try {
    const adapter = getAdapter(platform);
    const tokens = await adapter.exchangeCode(code);
    const profile = await adapter.fetchProfile(tokens.access_token);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const admin = getSupabaseAdmin();
    const { error: upsertError } = await admin
      .from("connected_accounts")
      .upsert(
        {
          user_id: user.id,
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

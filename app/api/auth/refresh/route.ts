import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/encrypt";
import { getAdapter } from "@/lib/platforms";
import type { ConnectedAccountRow, Platform } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel cron will call this hourly. Also callable manually with CRON_SECRET header.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  // 2-hour buffer
  const cutoff = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: rowsRaw, error } = await admin
    .from("connected_accounts")
    .select("*")
    .lt("token_expires_at", cutoff)
    .not("refresh_token", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (rowsRaw ?? []) as ConnectedAccountRow[];
  const summary: { platform: Platform; id: string; ok: boolean; error?: string }[] = [];

  for (const row of rows) {
    try {
      const adapter = getAdapter(row.platform);
      if (!adapter.refresh) {
        summary.push({ platform: row.platform, id: row.id, ok: false, error: "no_refresh_support" });
        continue;
      }
      const refreshTok = row.refresh_token ? decrypt(row.refresh_token) : null;
      if (!refreshTok) {
        summary.push({ platform: row.platform, id: row.id, ok: false, error: "no_refresh_token" });
        continue;
      }
      const tokens = await adapter.refresh(refreshTok);
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;
      await admin
        .from("connected_accounts")
        .update({
          access_token: encrypt(tokens.access_token),
          refresh_token: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : row.refresh_token,
          token_expires_at: expiresAt,
        })
        .eq("id", row.id);
      summary.push({ platform: row.platform, id: row.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown_error";
      console.error(`[refresh:${row.platform}]`, msg);
      summary.push({ platform: row.platform, id: row.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ refreshed: summary });
}

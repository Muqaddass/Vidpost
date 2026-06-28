import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateRawKey, hashKey, keyPrefix } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** List the current user's API keys (no secrets). */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("api_keys")
    .select("id,label,key_prefix,last_used_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ keys: data ?? [] });
}

/** Create a new API key. Returns the raw key ONCE. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let label = "API key";
  try {
    const body = z.object({ label: z.string().max(80).optional() }).parse(await req.json());
    if (body.label) label = body.label;
  } catch {
    /* default label */
  }

  const raw = generateRawKey();
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("api_keys").insert({
    user_id: user.id,
    label,
    key_hash: hashKey(raw),
    key_prefix: keyPrefix(raw),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Raw key is shown once and never stored.
  return NextResponse.json({ key: raw });
}

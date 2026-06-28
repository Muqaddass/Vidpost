import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Machine-to-machine API keys. Only the SHA-256 hash is stored; the raw key is
// returned once at creation. Format: vp_<48 hex chars>.

export function generateRawKey(): string {
  return `vp_${randomBytes(24).toString("hex")}`;
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw.trim()).digest("hex");
}

export function keyPrefix(raw: string): string {
  return raw.slice(0, 9); // "vp_" + first 6 hex
}

/** Resolve an API key to its owner user id (and stamp last_used_at). */
export async function verifyApiKey(raw: string | null): Promise<string | null> {
  if (!raw || !raw.startsWith("vp_")) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("api_keys")
    .select("id,user_id")
    .eq("key_hash", hashKey(raw))
    .maybeSingle();
  if (!data) return null;
  // best-effort usage stamp
  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return data.user_id as string;
}

/** Pull the bearer token from an Authorization header. */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

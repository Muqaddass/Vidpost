import { cookies } from "next/headers";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

// OAuth state is stored in an HttpOnly cookie, signed with NEXTAUTH_SECRET so a tampered
// state from a malicious redirect cannot impersonate a legitimate flow.

const COOKIE_PREFIX = "vp_oauth_state_";

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET env not set");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function setOAuthState(platform: string): Promise<string> {
  const raw = randomBytes(24).toString("hex");
  const sig = sign(raw);
  const value = `${raw}.${sig}`;
  const jar = await cookies();
  jar.set(`${COOKIE_PREFIX}${platform}`, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return raw;
}

export async function verifyOAuthState(
  platform: string,
  received: string | null,
): Promise<boolean> {
  if (!received) return false;
  const jar = await cookies();
  const cookie = jar.get(`${COOKIE_PREFIX}${platform}`);
  jar.delete(`${COOKIE_PREFIX}${platform}`); // one-shot
  if (!cookie) return false;
  const [raw, sig] = cookie.value.split(".");
  if (!raw || !sig) return false;
  if (raw !== received) return false;
  const expected = sign(raw);
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

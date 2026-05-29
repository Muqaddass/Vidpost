import { cookies } from "next/headers";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

// OAuth state is stored in an HttpOnly cookie, signed with NEXTAUTH_SECRET so a tampered
// state from a malicious redirect cannot impersonate a legitimate flow.
// The cookie also carries the user_id so the callback can identify the user even when
// the callback runs on a different origin than the original session (cross-domain bounce).

const COOKIE_PREFIX = "vp_oauth_state_";

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET env not set");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

// Cookie value format: <raw>.<userId>.<sig> where sig = HMAC(raw + ":" + userId)
export async function setOAuthState(
  platform: string,
  userId: string,
): Promise<string> {
  const raw = randomBytes(24).toString("hex");
  const sig = sign(`${raw}:${userId}`);
  const value = `${raw}.${userId}.${sig}`;
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

export interface OAuthStateVerification {
  ok: boolean;
  userId: string | null;
}

export async function verifyOAuthState(
  platform: string,
  received: string | null,
): Promise<OAuthStateVerification> {
  if (!received) return { ok: false, userId: null };
  const jar = await cookies();
  const cookie = jar.get(`${COOKIE_PREFIX}${platform}`);
  jar.delete(`${COOKIE_PREFIX}${platform}`); // one-shot
  if (!cookie) return { ok: false, userId: null };
  const [raw, userId, sig] = cookie.value.split(".");
  if (!raw || !userId || !sig) return { ok: false, userId: null };
  if (raw !== received) return { ok: false, userId: null };
  const expected = sign(`${raw}:${userId}`);
  try {
    const ok = timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
    return { ok, userId: ok ? userId : null };
  } catch {
    return { ok: false, userId: null };
  }
}

// Sign a user_id for the cross-domain bounce URL params. Lets the bounced
// route trust that the user was authenticated on the original domain.
export function signUserIdForBounce(userId: string): string {
  return sign(`bounce:${userId}`);
}

export function verifyBounceUserId(
  userId: string | null,
  sig: string | null,
): string | null {
  if (!userId || !sig) return null;
  const expected = sign(`bounce:${userId}`);
  try {
    const ok = timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
    return ok ? userId : null;
  } catch {
    return null;
  }
}

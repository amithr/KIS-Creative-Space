import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Studio Admin gate: one shared password (STUDIO_ADMIN_PW, server-only).
 * The cookie carries an HMAC of a fixed token so it can't be forged without
 * the password; it is not a Supabase session — Studio mutations run through
 * the service-role client after this check.
 */
const COOKIE = "kis_studio_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.STUDIO_ADMIN_PW?.trim() || "";
}

function token(s: string) {
  return createHmac("sha256", s).update("kis-studio-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function studioConfigured() {
  return Boolean(secret());
}

export async function isStudioAdmin(): Promise<boolean> {
  const s = secret();
  if (!s) return false;
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  return Boolean(raw && safeEqual(raw, token(s)));
}

export function checkStudioPassword(pw: string) {
  const s = secret();
  return Boolean(s) && safeEqual(pw, s);
}

export async function setStudioSession() {
  const store = await cookies();
  store.set(COOKIE, token(secret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearStudioSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

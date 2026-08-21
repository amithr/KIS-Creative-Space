import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "kis_teacher_portal";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function portalSecret() {
  return process.env.TEACHER_PORTAL_PW?.trim() || "";
}

function sign(email: string, secret: string) {
  return createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}

function pack(email: string, secret: string) {
  const e = email.toLowerCase().trim();
  return `${e}.${sign(e, secret)}`;
}

function unpack(raw: string, secret: string): string | null {
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const email = raw.slice(0, i).toLowerCase().trim();
  const sig = raw.slice(i + 1);
  const expected = sign(email, secret);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return email;
}

export function isValidTeacherEmail(email: string) {
  return /.+@.+\..+/.test(email.trim());
}

export async function getTeacherPortalEmail(): Promise<string | null> {
  const secret = portalSecret();
  if (!secret) return null;
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  return unpack(raw, secret);
}

export async function setTeacherPortalSession(email: string) {
  const secret = portalSecret();
  if (!secret) {
    throw new Error("TEACHER_PORTAL_PW is not configured.");
  }
  const store = await cookies();
  store.set(COOKIE, pack(email, secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearTeacherPortalSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export function checkTeacherPortalPassword(password: string): boolean {
  const secret = portalSecret();
  if (!secret) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function teacherPortalConfigured() {
  return Boolean(portalSecret());
}

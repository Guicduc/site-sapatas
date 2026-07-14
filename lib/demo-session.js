import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const DEMO_COOKIE = "baseforma-demo";
const DEMO_MAX_AGE = 60 * 60 * 24 * 14;

function configuredToken() {
  return String(process.env.DEMO_ACCESS_TOKEN || "").trim();
}

function digest(value) {
  return createHash("sha256").update(String(value || "")).digest();
}

export function isValidDemoToken(token) {
  const expected = configuredToken();
  if (!expected || !token) return false;
  return timingSafeEqual(digest(token), digest(expected));
}

export async function isDemoSession() {
  const expected = configuredToken();
  if (!expected) return false;
  const cookieStore = await cookies();
  const received = cookieStore.get(DEMO_COOKIE)?.value || "";
  return received === createHash("sha256").update(expected).digest("base64url");
}

export function demoCookieValue() {
  return createHash("sha256").update(configuredToken()).digest("base64url");
}

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_MAX_AGE
  };
}

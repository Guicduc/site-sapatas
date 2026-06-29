import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "baseforma-admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function getSigningSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET || process.env.ACCOUNT_SESSION_SECRET;

  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "baseforma-admin-local-development-only";

  throw new Error("ADMIN_SESSION_SECRET precisa estar configurado em producao.");
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function canUseAdminToken(token) {
  if (process.env.ADMIN_ACCESS_TOKEN) {
    return Boolean(token && token === process.env.ADMIN_ACCESS_TOKEN);
  }

  return process.env.NODE_ENV !== "production";
}

export function createAdminSessionToken() {
  const payload = encode(JSON.stringify({
    role: "admin",
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
  }));

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token) {
  try {
    const [payload, receivedSignature] = String(token || "").split(".");
    const expectedSignature = sign(payload);
    const received = Buffer.from(receivedSignature || "");
    const expected = Buffer.from(expectedSignature);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.role !== "admin" || Number(session.expiresAt) <= Date.now()) return null;
    return { role: "admin", issuedAt: session.issuedAt, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function getAdminAccess(token = "") {
  if (canUseAdminToken(token)) {
    return { allowed: true, viaToken: Boolean(token), token };
  }

  const session = await getAdminSession();
  return session ? { allowed: true, viaToken: false, token: "" } : { allowed: false, viaToken: false, token: "" };
}

export async function assertAdminAccess(token = "") {
  const access = await getAdminAccess(token);
  if (!access.allowed) {
    throw new Error("admin_unauthorized");
  }
  return access;
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  };
}

export function adminHref(pathname, access) {
  if (!access?.viaToken || !access.token) return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}token=${encodeURIComponent(access.token)}`;
}

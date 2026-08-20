import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionByToken } from "@/lib/account-auth";

export const ACCOUNT_COOKIE = "baseforma-account";
export const ORDER_ACCESS_COOKIE = "baseforma-order-access";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const ORDER_ACCESS_DURATION_SECONDS = 60 * 60 * 2;

function getSecret() {
  const configured = process.env.ACCOUNT_SESSION_SECRET;

  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "baseforma-local-development-only";

  throw new Error("ACCOUNT_SESSION_SECRET precisa estar configurado em produção.");
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function normalizeAccountEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function hashAccountCode(email, code) {
  return createHmac("sha256", getSecret())
    .update(`${normalizeAccountEmail(email)}:${String(code || "").trim()}`)
    .digest("hex");
}

export function createAccountSessionToken(email) {
  const payload = encode(JSON.stringify({
    email: normalizeAccountEmail(email),
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
  }));
  return `${payload}.${sign(payload)}`;
}

export function createOrderAccessToken(orderId) {
  const payload = encode(JSON.stringify({
    orderId: String(orderId || ""),
    expiresAt: Date.now() + ORDER_ACCESS_DURATION_SECONDS * 1000
  }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAccountSessionToken(token) {
  try {
    const [payload, receivedSignature] = String(token || "").split(".");
    const expectedSignature = sign(payload);
    const received = Buffer.from(receivedSignature || "");
    const expected = Buffer.from(expectedSignature);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.email || Number(session.expiresAt) <= Date.now()) return null;
    return { email: normalizeAccountEmail(session.email), expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export async function getAccountSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_COOKIE)?.value;
  const session = token ? await getSessionByToken(token) : null;
  if (session) return {
    accountId: session.account_id || session.accountId,
    email: session.email,
    expiresAt: session.expires_at || session.expiresAt,
    recentAuthAt: session.recent_auth_at || session.recentAuthAt,
    passwordAvailable: Boolean(session.password_hash || session.passwordHash),
    token
  };
  return null;
}

export async function getOrderAccess() {
  const cookieStore = await cookies();
  const session = verifySignedPayload(cookieStore.get(ORDER_ACCESS_COOKIE)?.value);
  return session?.orderId ? session : null;
}

function verifySignedPayload(token) {
  try {
    const [payload, receivedSignature] = String(token || "").split(".");
    const expectedSignature = sign(payload);
    const received = Buffer.from(receivedSignature || "");
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const result = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(result.expiresAt) > Date.now() ? result : null;
  } catch {
    return null;
  }
}

export function getAccountCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    priority: "high",
    maxAge: SESSION_DURATION_SECONDS
  };
}

export function getOrderAccessCookieOptions() {
  return { ...getAccountCookieOptions(), maxAge: ORDER_ACCESS_DURATION_SECONDS };
}

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/site-data";

export const GOOGLE_OAUTH_COOKIE = "baseforma-google-oauth";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_DURATION_SECONDS = 10 * 60;

function getSecret() {
  const configured = process.env.ACCOUNT_SESSION_SECRET;

  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "baseforma-local-development-only";

  throw new Error("ACCOUNT_SESSION_SECRET precisa estar configurado em producao.");
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function createSignedPayload(value) {
  const payload = encode(JSON.stringify(value));
  return `${payload}.${sign(payload)}`;
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

export function hasGoogleOAuthConfig() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function getGoogleOAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_DURATION_SECONDS
  };
}

export function createGoogleOAuthRequest({ returnTo = "/conta" } = {}) {
  if (!hasGoogleOAuthConfig()) {
    const error = new Error("Login Google nao esta configurado.");
    error.code = "missing_google_oauth_config";
    throw error;
  }

  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const redirectUri = getGoogleRedirectUri();
  const authUrl = new URL(AUTH_ENDPOINT);

  authUrl.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  if (process.env.GOOGLE_OAUTH_LOGIN_HINT) {
    authUrl.searchParams.set("login_hint", process.env.GOOGLE_OAUTH_LOGIN_HINT);
  }

  return {
    authUrl,
    stateCookie: createSignedPayload({
      state,
      codeVerifier,
      returnTo: normalizeReturnTo(returnTo),
      expiresAt: Date.now() + STATE_DURATION_SECONDS * 1000
    })
  };
}

export function verifyGoogleOAuthState({ state, stateCookie }) {
  const payload = verifySignedPayload(stateCookie);
  if (!payload?.state || payload.state !== state || !payload.codeVerifier) return null;
  return {
    codeVerifier: payload.codeVerifier,
    returnTo: normalizeReturnTo(payload.returnTo)
  };
}

export async function exchangeGoogleOAuthCode({ code, codeVerifier }) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getGoogleRedirectUri()
    }),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error_description || data?.error || "Nao foi possivel concluir o login Google.");
    error.code = "google_oauth_token_failed";
    error.details = data;
    throw error;
  }

  return data;
}

export async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error_description || data?.error || "Nao foi possivel carregar os dados da conta Google.");
    error.code = "google_userinfo_failed";
    error.details = data;
    throw error;
  }

  if (!data.email || data.email_verified === false) {
    const error = new Error("A conta Google precisa ter e-mail verificado.");
    error.code = "google_email_not_verified";
    throw error;
  }

  return data;
}

export function getGoogleRedirectUri() {
  return `${getPublicBaseUrl()}/api/account/google/callback`;
}

function getPublicBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return siteUrl.replace(/\/$/, "");
}

function normalizeReturnTo(value) {
  const path = String(value || "/conta").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/conta";
  if (path.startsWith("/api/")) return "/conta";
  return path;
}

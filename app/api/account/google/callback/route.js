import { NextResponse } from "next/server";

import {
  ACCOUNT_COOKIE,
  createAccountSessionToken,
  getAccountCookieOptions,
  normalizeAccountEmail
} from "@/lib/account-session";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  getGoogleOAuthCookieOptions,
  GOOGLE_OAUTH_COOKIE,
  verifyGoogleOAuthState
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const stateCookie = request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value;
  const baseResponseUrl = new URL("/conta", request.url);

  if (error) {
    baseResponseUrl.searchParams.set("error", "google_login_cancelled");
    return clearOAuthCookie(NextResponse.redirect(baseResponseUrl));
  }

  const verifiedState = verifyGoogleOAuthState({ state, stateCookie });
  if (!code || !verifiedState) {
    baseResponseUrl.searchParams.set("error", "google_state_invalid");
    return clearOAuthCookie(NextResponse.redirect(baseResponseUrl));
  }

  try {
    const token = await exchangeGoogleOAuthCode({
      code,
      codeVerifier: verifiedState.codeVerifier
    });
    const user = await fetchGoogleUserInfo(token.access_token);
    const response = NextResponse.redirect(new URL(verifiedState.returnTo, request.url));
    response.cookies.set(ACCOUNT_COOKIE, createAccountSessionToken(normalizeAccountEmail(user.email)), getAccountCookieOptions());
    return clearOAuthCookie(response);
  } catch (caughtError) {
    baseResponseUrl.searchParams.set("error", caughtError.code || "google_login_failed");
    return clearOAuthCookie(NextResponse.redirect(baseResponseUrl));
  }
}

function clearOAuthCookie(response) {
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...getGoogleOAuthCookieOptions(), maxAge: 0 });
  return response;
}

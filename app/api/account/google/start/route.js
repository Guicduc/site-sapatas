import { NextResponse } from "next/server";

import {
  createGoogleOAuthRequest,
  getGoogleOAuthCookieOptions,
  GOOGLE_OAUTH_COOKIE
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);
    const { authUrl, stateCookie } = createGoogleOAuthRequest({
      returnTo: requestUrl.searchParams.get("returnTo") || "/conta"
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_OAUTH_COOKIE, stateCookie, getGoogleOAuthCookieOptions());
    return response;
  } catch (error) {
    const url = new URL("/conta", request.url);
    url.searchParams.set("error", error.code || "google_login_unavailable");
    return NextResponse.redirect(url);
  }
}

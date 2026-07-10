import { NextResponse } from "next/server";

import {
  DEMO_COOKIE,
  demoCookieOptions,
  demoCookieValue,
  isValidDemoToken
} from "@/lib/demo-session";

export async function GET(request, { params }) {
  const { token } = await params;
  if (!isValidDemoToken(token)) {
    return withPrivateHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  const response = NextResponse.redirect(new URL("/catalogo?demonstracao=ativa", request.url));
  response.cookies.set(DEMO_COOKIE, demoCookieValue(), demoCookieOptions());
  return withPrivateHeaders(response);
}

function withPrivateHeaders(response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

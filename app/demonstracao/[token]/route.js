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
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(new URL("/catalogo?demonstracao=ativa", request.url));
  response.cookies.set(DEMO_COOKIE, demoCookieValue(), demoCookieOptions());
  return response;
}

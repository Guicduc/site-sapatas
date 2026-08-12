import { NextResponse } from "next/server";

import { ACCOUNT_COOKIE, getAccountCookieOptions, getAccountSession } from "@/lib/account-session";
import { revokeCustomerAccountSessions } from "@/lib/account-auth";

export async function DELETE(request) {
  const session = await getAccountSession();
  if (session?.accountId) await revokeCustomerAccountSessions(session.accountId);
  const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ACCOUNT_COOKIE, "", { ...getAccountCookieOptions(), maxAge: 0 });
  return response;
}

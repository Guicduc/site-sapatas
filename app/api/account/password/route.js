import { NextResponse } from "next/server";

import { getAccountSession } from "@/lib/account-session";
import { ACCOUNT_COOKIE, getAccountCookieOptions } from "@/lib/account-session";
import { issueAccountSession, revokeCustomerAccountSessions, updatePassword } from "@/lib/account-auth";
import { sendAccountPasswordChangedEmail } from "@/lib/transactional-email";

export async function POST(request) {
  const session = await getAccountSession();
  if (!session?.accountId) return failure(401, "Não foi possível concluir essa ação.");
  const body = await request.json().catch(() => ({}));
  if (!sameOrigin(request)) return failure(403, "Não foi possível concluir essa ação.");
  try {
    await updatePassword(session.accountId, body.password);
    await sendAccountPasswordChangedEmail(session.email);
    await revokeCustomerAccountSessions(session.accountId);
    const token = await issueAccountSession(session.accountId);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ACCOUNT_COOKIE, token, getAccountCookieOptions());
    return response;
  } catch (error) {
    return failure(400, error.message || "Não foi possível salvar a senha.");
  }
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !origin || (host && new URL(origin).host === host);
}

function failure(status, message) {
  return NextResponse.json({ error: "password_action_failed", message }, { status, headers: { "Cache-Control": "no-store" } });
}

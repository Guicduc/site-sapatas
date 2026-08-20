import { NextResponse } from "next/server";

import { getAccountSession } from "@/lib/account-session";
import { hashSessionToken, revokeCustomerAccountSessions } from "@/lib/account-auth";

export async function DELETE(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin", message: "Não foi possível concluir essa ação." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const session = await getAccountSession();
  if (!session?.accountId) {
    return NextResponse.json({ error: "unauthenticated", message: "Entre novamente para gerenciar suas sessões." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await revokeCustomerAccountSessions(session.accountId, hashSessionToken(session.token));
  return NextResponse.json({ revokedOthers: true }, { headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  try {
    return !origin || (host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

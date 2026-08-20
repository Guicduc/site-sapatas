import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

import {
  ACCOUNT_COOKIE,
  getAccountCookieOptions,
  hashAccountCode,
  normalizeAccountEmail
} from "@/lib/account-session";
import {
  consumeAccountAccessCode,
  getOrderByNumberAndEmail,
  hasRecentAccountAccessCode,
  saveAccountAccessCode,
  verifyOrderEmail
} from "@/lib/order-store";
import { consumeAccountRateLimit } from "@/lib/order-store";
import { createHash } from "node:crypto";
import { establishAccountFromVerifiedOrder, findCustomerAccount, issueAccountSession, revokeCustomerAccountSessions, verifyPassword } from "@/lib/account-auth";
import { sendAccountAccessCodeEmail } from "@/lib/transactional-email";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const email = normalizeAccountEmail(payload.email);
  const originKey = createHash("sha256").update(`${email}:${request.headers.get("x-forwarded-for") || "anonymous"}`).digest("hex");
  if (process.env.NODE_ENV === "production" && !(await consumeAccountRateLimit(originKey))) {
    return NextResponse.json({ error: "rate_limited", message: "Não foi possível concluir essa ação agora." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "900" } });
  }

  if (payload.password) {
    const account = await findCustomerAccount(email);
    const valid = account && account.password_hash && await verifyPassword(account.password_hash, payload.password);
    if (!valid) return genericAuthFailure();
    const token = await issueAccountSession(account.id);
    const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ACCOUNT_COOKIE, token, getAccountCookieOptions());
    return response;
  }

  if (payload.code) {
    const claimedOrderId = await consumeAccountAccessCode({ email, codeHash: hashAccountCode(email, payload.code) });
    if (!claimedOrderId) {
      return NextResponse.json(
        { error: "invalid_code", message: "Código inválido ou expirado." },
        { status: 401 }
      );
    }
    await verifyOrderEmail(claimedOrderId, email);
    const account = claimedOrderId ? null : await findCustomerAccount(email);
    const established = claimedOrderId
      ? await establishAccountFromVerifiedOrder({ email, orderId: claimedOrderId })
      : account ? { account, token: await issueAccountSession(account.id) } : null;
    if (!established) return genericAuthFailure();
    const response = NextResponse.json({ authenticated: true, passwordAvailable: Boolean(established.account.password_hash || established.account.passwordHash) });
    response.cookies.set(ACCOUNT_COOKIE, established.token, getAccountCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const recovery = payload.recovery === true;
  const order = recovery ? null : await getOrderByNumberAndEmail(payload.orderNumber, email);

  if (!email || (!order && !recovery)) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "E-mail ou número do pedido não conferem." },
      { status: 401 }
    );
  }

  // Rate limiting protects production email delivery, but only slows local testing.
  if (process.env.NODE_ENV === "production" && await hasRecentAccountAccessCode(email)) {
    return NextResponse.json(
      {
        error: "code_recently_sent",
        message: "Um código já foi enviado. Aguarde um minuto antes de solicitar outro.",
        retryAfter: 60
      },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const code = String(randomInt(100000, 1000000));
  await saveAccountAccessCode({
    email,
    orderId: order?.id || null,
    codeHash: hashAccountCode(email, code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });

  try {
    await sendAccountAccessCodeEmail(email, code);
  } catch (error) {
    return NextResponse.json(
      { error: "email_unavailable", message: error.message || "Não foi possível enviar o código." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    challenge: true,
    message: "Código enviado. Confira sua caixa de entrada.",
    retryAfter: 60,
    expiresIn: 600,
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {})
  }, { headers: { "Cache-Control": "no-store" } });
}

function genericAuthFailure() {
  return NextResponse.json({ error: "invalid_credentials", message: "E-mail ou senha não conferem." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ACCOUNT_COOKIE, "", { ...getAccountCookieOptions(), maxAge: 0 });
  return response;
}

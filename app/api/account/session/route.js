import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

import {
  ACCOUNT_COOKIE,
  createAccountSessionToken,
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
import { sendAccountAccessCodeEmail } from "@/lib/transactional-email";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const email = normalizeAccountEmail(payload.email);

  if (payload.code) {
    const claimedOrderId = await consumeAccountAccessCode({ email, codeHash: hashAccountCode(email, payload.code) });
    if (!claimedOrderId) {
      return NextResponse.json(
        { error: "invalid_code", message: "Código inválido ou expirado." },
        { status: 401 }
      );
    }
    await verifyOrderEmail(claimedOrderId, email);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ACCOUNT_COOKIE, createAccountSessionToken(email), getAccountCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const order = await getOrderByNumberAndEmail(payload.orderNumber, email);

  if (!email || !order) {
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
    orderId: order.id,
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

export async function DELETE() {
  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ACCOUNT_COOKIE, "", { ...getAccountCookieOptions(), maxAge: 0 });
  return response;
}

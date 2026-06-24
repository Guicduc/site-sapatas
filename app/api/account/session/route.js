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
        { error: "invalid_code", message: "Codigo invalido ou expirado." },
        { status: 401 }
      );
    }
    await verifyOrderEmail(claimedOrderId, email);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ACCOUNT_COOKIE, createAccountSessionToken(email), getAccountCookieOptions());
    return response;
  }

  const order = await getOrderByNumberAndEmail(payload.orderNumber, email);

  if (!email || !order) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "E-mail ou numero do pedido nao conferem." },
      { status: 401 }
    );
  }

  if (await hasRecentAccountAccessCode(email)) {
    return NextResponse.json(
      { error: "code_recently_sent", message: "Um codigo ja foi enviado. Aguarde um minuto antes de solicitar outro." },
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
      { error: "email_unavailable", message: error.message || "Nao foi possivel enviar o codigo." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    challenge: true,
    message: "Enviamos um codigo de 6 digitos para o seu e-mail.",
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {})
  });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ACCOUNT_COOKIE, "", { ...getAccountCookieOptions(), maxAge: 0 });
  return response;
}

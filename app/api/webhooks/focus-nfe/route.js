import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { refreshInvoiceStatus } from "@/lib/invoice-provider";
import { getOrderById } from "@/lib/order-store";

export async function POST(request) {
  const expectedToken = cleanText(process.env.FOCUS_NFE_WEBHOOK_TOKEN);

  if (!expectedToken) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const receivedToken = cleanText(request.headers.get("authorization"));

  if (!safeTokenEquals(receivedToken, expectedToken)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const reference = cleanText(payload?.ref);

  if (!reference) {
    return NextResponse.json({ received: true, ignored: "missing_ref" });
  }

  const order = await getOrderById(reference);

  if (!order) {
    return NextResponse.json({ received: true, ignored: "order_not_found", ref: reference });
  }

  // Consulta o estado autoritativo na API em vez de confiar no corpo da notificacao.
  const result = await refreshInvoiceStatus(order);

  return NextResponse.json({
    received: true,
    ref: reference,
    refreshed: Boolean(result.refreshed),
    ...(result.skipped ? { skipped: result.skipped } : {}),
    ...(result.error ? { error: result.error } : {})
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "focus_nfe" });
}

function safeTokenEquals(received, expected) {
  if (!received) return false;

  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(receivedHash, expectedHash);
}

function cleanText(value) {
  return String(value || "").trim();
}

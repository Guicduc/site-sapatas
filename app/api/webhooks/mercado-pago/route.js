import { NextResponse } from "next/server";

import {
  fetchMercadoPagoPayment,
  mapMercadoPagoPaymentStatus,
  verifyMercadoPagoSignature
} from "@/lib/mercado-pago";
import { recordMercadoPagoUpdate } from "@/lib/order-store";
import { notifyPaymentResolved } from "@/lib/transactional-email";

export async function POST(request) {
  let payload;
  const requestUrl = new URL(request.url);

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (payload?.type === "local_test" && process.env.NODE_ENV !== "production") {
    const status = normalizeLocalStatus(payload.status);
    const order = await recordMercadoPagoUpdate({
      orderId: payload.orderId,
      preferenceId: payload.preferenceId || null,
      paymentId: payload.paymentId || `local-${Date.now()}`,
      status,
      amountBrl: payload.amountBrl || null,
      raw: payload
    });
    await notifyPaymentResolved(order, order?.paymentStatus || status);

    return NextResponse.json({
      received: true,
      localTest: true,
      status,
      orderId: order?.id || null
    });
  }

  const dataId = payload?.data?.id || requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("id");
  const topic = normalizeTopic(payload?.type || requestUrl.searchParams.get("type") || requestUrl.searchParams.get("topic"));
  const validSignature = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET
  });

  if (!validSignature) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (topic && topic !== "payment") {
    return NextResponse.json({ received: true, ignored: "unsupported_topic", topic });
  }

  if (!dataId) {
    return NextResponse.json({ received: true, ignored: "missing_data_id" });
  }

  try {
    const payment = await fetchMercadoPagoPayment(dataId);
    const status = mapMercadoPagoPaymentStatus(payment.status);
    const order = await recordMercadoPagoUpdate({
      orderId: payment.external_reference || payment.metadata?.order_id || null,
      preferenceId: payment.preference_id || null,
      paymentId: String(payment.id),
      status,
      amountBrl: payment.transaction_amount,
      raw: payment
    });
    await notifyPaymentResolved(order, order?.paymentStatus || status);

    return NextResponse.json({
      received: true,
      paymentId: payment.id,
      status,
      orderId: order?.id || null
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.code || "webhook_processing_failed",
        message: error.message || "Não foi possível processar o webhook."
      },
      { status: error.code === "missing_mercado_pago_token" ? 503 : 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "mercado_pago" });
}

function normalizeLocalStatus(status) {
  if (["approved", "rejected", "cancelled", "expired", "pending", "refunded"].includes(status)) {
    return status;
  }

  return "unknown";
}

function normalizeTopic(topic) {
  const normalized = String(topic || "").trim().toLowerCase();
  if (normalized === "payments") return "payment";
  return normalized;
}

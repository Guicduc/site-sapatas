import { NextResponse } from "next/server";

import { getAccountSession, getOrderAccess } from "@/lib/account-session";
import { createMercadoPagoPreference, getMercadoPagoCheckoutUrl } from "@/lib/mercado-pago";
import { createPayment, getLatestPaymentForOrder, getOrderById, getOrderForEmail } from "@/lib/order-store";
import { isPayableOrder, PAYMENT_STATUS } from "@/lib/order-status";

const PENDING_PAYMENT_REUSE_MINUTES = 120;

function isReusablePendingPayment(payment) {
  if (!payment?.checkoutUrl || payment.status !== PAYMENT_STATUS.PENDING) return false;

  const createdAt = Date.parse(payment.createdAt || payment.updatedAt || "");
  if (!Number.isFinite(createdAt)) return false;

  return Date.now() - createdAt <= PENDING_PAYMENT_REUSE_MINUTES * 60 * 1000;
}

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    const [session, orderAccess] = await Promise.all([getAccountSession(), getOrderAccess()]);
    let order = session ? await getOrderForEmail(orderId, session.email) : null;

    if (!order && orderAccess?.orderId === orderId) {
      order = await getOrderById(orderId);
    }

    if (!order) {
      return NextResponse.json(
        { error: "order_not_found", message: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (!isPayableOrder(order.status)) {
      return NextResponse.json(
        {
          error: "order_not_payable",
          message: "Este pedido precisa de revisão técnica antes de gerar cobrança."
        },
        { status: 409 }
      );
    }

    if (Number(order.totalBrl || 0) <= 0) {
      return NextResponse.json(
        {
          error: "order_without_amount",
          message: "Este pedido não possui valor cobrável."
        },
        { status: 409 }
      );
    }

    const existingPayment = await getLatestPaymentForOrder(order.id);

    if (isReusablePendingPayment(existingPayment)) {
      return NextResponse.json({
        payment: { status: existingPayment.status, amountBrl: existingPayment.amountBrl },
        checkoutUrl: existingPayment.checkoutUrl
      });
    }

    const preference = await createMercadoPagoPreference(order);
    const checkoutUrl = getMercadoPagoCheckoutUrl(preference);

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          error: "mercado_pago_checkout_url_missing",
          message: "Mercado Pago criou a preferencia, mas nao retornou URL de checkout."
        },
        { status: 502 }
      );
    }
    const payment = await createPayment({
      id: crypto.randomUUID(),
      orderId: order.id,
      provider: "mercado_pago",
      providerPreferenceId: preference.id,
      providerPaymentId: null,
      status: PAYMENT_STATUS.PENDING,
      checkoutUrl,
      amountBrl: order.totalBrl,
      raw: preference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      payment: { status: payment.status, amountBrl: payment.amountBrl },
      checkoutUrl
    });
  } catch (error) {
    const status = error.code === "missing_mercado_pago_token" ? 503 : 502;

    return NextResponse.json(
      {
        error: error.code || "mercado_pago_preference_failed",
        message: error.message || "Não foi possível gerar o pagamento.",
        details: error.details || null
      },
      { status }
    );
  }
}


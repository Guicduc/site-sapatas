import { NextResponse } from "next/server";

import { createMercadoPagoPreference } from "@/lib/mercado-pago";
import { createPayment, getLatestPaymentForOrder, getOrderById } from "@/lib/order-store";
import { isPayableOrder, PAYMENT_STATUS } from "@/lib/order-status";

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    const order = await getOrderById(orderId);

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

    if (existingPayment?.checkoutUrl && existingPayment.status === PAYMENT_STATUS.PENDING) {
      return NextResponse.json({ payment: existingPayment, checkoutUrl: existingPayment.checkoutUrl });
    }

    const preference = await createMercadoPagoPreference(order);
    const checkoutUrl = preference.init_point || preference.sandbox_init_point;
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

    return NextResponse.json({ payment, checkoutUrl });
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


import { NextResponse } from "next/server";

import { createPayment, getLatestPaymentForOrder, getOrderById } from "@/lib/order-store";
import { isPayableOrder, PAYMENT_STATUS } from "@/lib/order-status";
import { createShopifyDraftOrder } from "@/lib/shopify";

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "order_not_found", message: "Pedido nao encontrado." },
        { status: 404 }
      );
    }

    if (!isPayableOrder(order.status)) {
      return NextResponse.json(
        {
          error: "order_not_payable",
          message: "Este pedido precisa de revisao tecnica antes de gerar checkout."
        },
        { status: 409 }
      );
    }

    if (Number(order.totalBrl || 0) <= 0) {
      return NextResponse.json(
        {
          error: "order_without_amount",
          message: "Este pedido nao possui valor cobravel."
        },
        { status: 409 }
      );
    }

    const existingPayment = await getLatestPaymentForOrder(order.id);

    if (
      existingPayment?.provider === "shopify" &&
      existingPayment.checkoutUrl &&
      existingPayment.status === PAYMENT_STATUS.PENDING
    ) {
      return NextResponse.json({ payment: existingPayment, checkoutUrl: existingPayment.checkoutUrl });
    }

    const draftOrder = await createShopifyDraftOrder(order);
    const payment = await createPayment({
      id: crypto.randomUUID(),
      orderId: order.id,
      provider: "shopify",
      providerPreferenceId: draftOrder.id,
      providerPaymentId: null,
      status: PAYMENT_STATUS.PENDING,
      checkoutUrl: draftOrder.invoiceUrl,
      amountBrl: order.totalBrl,
      raw: draftOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ payment, checkoutUrl: draftOrder.invoiceUrl });
  } catch (error) {
    const status = error.code === "missing_shopify_credentials" ? 503 : 502;

    return NextResponse.json(
      {
        error: error.code || "shopify_draft_order_failed",
        message: error.message || "Nao foi possivel gerar o checkout Shopify.",
        details: error.details || null
      },
      { status }
    );
  }
}

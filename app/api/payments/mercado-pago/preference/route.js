import { NextResponse } from "next/server";

import { getAccountSession, getOrderAccess } from "@/lib/account-session";
import {
  createMercadoPagoPreference,
  getMercadoPagoCheckoutUrl
} from "@/lib/mercado-pago";
import { getOrCreatePendingMercadoPagoPayment, getOrderById, getOrderForAccountId } from "@/lib/order-store";
import { isPayableOrder, PAYMENT_STATUS } from "@/lib/order-status";

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    const [session, orderAccess] = await Promise.all([getAccountSession(), getOrderAccess()]);
    let order = session ? await getOrderForAccountId(orderId, session.accountId) : null;

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

    const result = await getOrCreatePendingMercadoPagoPayment(order.id, async () => {
      const preference = await createMercadoPagoPreference(order);
      const checkoutUrl = getMercadoPagoCheckoutUrl(preference);

      if (!checkoutUrl) {
        const error = new Error("Mercado Pago criou a preferencia, mas nao retornou URL de checkout.");
        error.code = "mercado_pago_checkout_url_missing";
        throw error;
      }

      return {
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
      };
    });
    const payment = result?.payment;

    if (!payment) {
      return NextResponse.json(
        { error: "order_not_found", message: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payment: { status: payment.status, amountBrl: payment.amountBrl },
      checkoutUrl: payment.checkoutUrl
    });
  } catch (error) {
    const status = error.code === "missing_mercado_pago_token"
      ? 503
      : error.code === "order_not_payable"
        ? 409
        : 502;

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


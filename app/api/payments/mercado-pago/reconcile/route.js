import { NextResponse } from "next/server";

import { getAccountSession, getOrderAccess } from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { requestInvoiceAfterPayment } from "@/lib/invoice-provider";
import {
  hasMercadoPagoCredentials,
  mapMercadoPagoPaymentStatus,
  searchMercadoPagoPaymentsByReference
} from "@/lib/mercado-pago";
import { getOrderById, getOrderForEmail, recordMercadoPagoUpdate } from "@/lib/order-store";
import { ORDER_STATUS } from "@/lib/order-status";
import { notifyPaymentResolved } from "@/lib/transactional-email";

// Reconciliação ativa com o Mercado Pago: consulta os pagamentos do pedido por
// external_reference e grava o resultado, sem depender do webhook. Chamado no
// retorno do checkout e no botão "Atualizar status" da confirmação de pedido.
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

    if (!hasMercadoPagoCredentials()) {
      return NextResponse.json(
        {
          error: "missing_mercado_pago_token",
          message: "A consulta ao Mercado Pago não está configurada."
        },
        { status: 503 }
      );
    }

    const payments = await searchMercadoPagoPaymentsByReference(order.id);
    const payment = pickMostRelevantPayment(payments);

    if (!payment) {
      return NextResponse.json({ reconciled: false, order: toAccountOrder(order) });
    }

    const status = mapMercadoPagoPaymentStatus(payment.status);
    const updatedOrder = await recordMercadoPagoUpdate({
      orderId: order.id,
      preferenceId: payment.preference_id || null,
      paymentId: String(payment.id),
      status,
      amountBrl: payment.transaction_amount,
      raw: payment
    });
    // Um pagamento tardio pode chegar depois de o checkout ter substituido e
    // cancelado o pedido. Registre e alerte esse caso, mas jamais envie e-mail
    // de confirmacao ou emita NF-e para ele.
    if (updatedOrder?.status !== ORDER_STATUS.CANCELLED && !updatedOrder?.metadata?.paymentReview) {
      await notifyPaymentResolved(updatedOrder, updatedOrder?.paymentStatus || status);
      await requestInvoiceAfterPayment(updatedOrder, payment);
    }

    return NextResponse.json({
      reconciled: true,
      paymentId: payment.id,
      status,
      order: toAccountOrder(updatedOrder || order)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.code || "mercado_pago_reconcile_failed",
        message: error.message || "Não foi possível consultar o pagamento no Mercado Pago."
      },
      { status: error.code === "missing_mercado_pago_token" ? 503 : 502 }
    );
  }
}

// Um pedido pode acumular tentativas de pagamento (recusas antes da aprovação):
// um pagamento aprovado sempre vence; sem aprovado, vale o mais recente.
function pickMostRelevantPayment(payments) {
  if (!payments.length) {
    return null;
  }

  const sorted = payments
    .slice()
    .sort((left, right) => new Date(right.date_created || 0) - new Date(left.date_created || 0));

  return sorted.find((payment) => payment.status === "approved") || sorted[0];
}

import { NextResponse } from "next/server";

import {
  ORDER_ACCESS_COOKIE,
  createOrderAccessToken,
  getOrderAccess,
  getOrderAccessCookieOptions
} from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { cancelSupersededOrder, createOrder } from "@/lib/order-store";
import { buildOrderDraft } from "@/lib/order-validation";
import { notifyOrderCreated } from "@/lib/transactional-email";
import { isDemoSession } from "@/lib/demo-session";
import { buildFulfillmentMetadata } from "@/lib/fulfillment";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

export async function POST(request) {
  try {
    const payload = await request.json();
    const orderDraft = await buildOrderDraft(payload);
    if (await isDemoSession()) {
      const now = new Date().toISOString();
      const demoOrder = {
        ...orderDraft,
        demo: true,
        status: orderDraft.technicalReview ? orderDraft.status : ORDER_STATUS.PAID_READY_FOR_PRODUCTION,
        paymentStatus: orderDraft.technicalReview ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.APPROVED,
        metadata: {
          ...orderDraft.metadata,
          demo: true,
          account: { emailVerifiedAt: now },
          fulfillment: buildFulfillmentMetadata(
            {
              ...orderDraft,
              status: ORDER_STATUS.PAID_READY_FOR_PRODUCTION,
              paymentStatus: PAYMENT_STATUS.APPROVED
            },
            { eventType: "demo_payment_approved" },
            now
          )
        },
        payments: orderDraft.technicalReview ? [] : [{
          id: crypto.randomUUID(),
          provider: "demo",
          status: PAYMENT_STATUS.APPROVED,
          amountBrl: orderDraft.totalBrl,
          checkoutUrl: null,
          createdAt: now,
          updatedAt: now
        }],
        technicalReviews: orderDraft.technicalReview ? [{
          id: crypto.randomUUID(),
          ...orderDraft.technicalReview,
          createdAt: now,
          updatedAt: now
        }] : []
      };
      return NextResponse.json({ order: toAccountOrder(demoOrder), demo: true }, { status: 201 });
    }
    const order = await createOrder(orderDraft);
    await notifyOrderCreated(order);
    await cancelReplacedOrder(payload.replacesOrderId, order.id);

    const response = NextResponse.json({ order: toAccountOrder(order) }, { status: 201 });
    response.cookies.set(
      ORDER_ACCESS_COOKIE,
      createOrderAccessToken(order.id),
      getOrderAccessCookieOptions()
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "order_create_failed",
        message: error.message || "Não foi possível criar o pedido."
      },
      { status: 400 }
    );
  }
}

// Cancela o pedido anterior quando o checkout cria um substituto (o carrinho
// mudou desde o pedido guardado). Exige que o cookie de acesso aponte para o
// pedido substituído, e nunca bloqueia a criação do novo pedido.
async function cancelReplacedOrder(replacesOrderId, newOrderId) {
  if (!replacesOrderId || replacesOrderId === newOrderId) {
    return;
  }

  try {
    const orderAccess = await getOrderAccess();

    if (orderAccess?.orderId === replacesOrderId) {
      await cancelSupersededOrder(replacesOrderId);
    }
  } catch (error) {
    console.warn("[orders] falha ao cancelar pedido substituido", {
      replacesOrderId,
      error: error.message
    });
  }
}


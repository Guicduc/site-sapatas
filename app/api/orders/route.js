import { NextResponse } from "next/server";

import {
  ORDER_ACCESS_COOKIE,
  createOrderAccessToken,
  getAccountSession,
  getOrderAccess,
  getOrderAccessCookieOptions
} from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import {
  cancelSupersededOrder,
  consumeOrderCreationRateLimit,
  createOrder
} from "@/lib/order-store";
import { getAnonymousOrderRateLimitKey, parseLimitedJsonRequest } from "@/lib/order-limits";
import { buildOrderDraft } from "@/lib/order-validation";
import { notifyOrderCreated } from "@/lib/transactional-email";
import { isDemoSession } from "@/lib/demo-session";
import { buildFulfillmentMetadata } from "@/lib/fulfillment";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";

// Limite explicito da funcao: cobre os timeouts dos provedores (Mercado Pago
// 10s, Melhor Envio 8s, Focus NFe 15s) e fica abaixo do lease da fila (120s).
export const maxDuration = 60;

export async function POST(request) {
  try {
    const payload = await parseLimitedJsonRequest(request);
    const demoSession = await isDemoSession();
    if (!demoSession) {
      const allowed = await consumeOrderCreationRateLimit(getAnonymousOrderRateLimitKey(request));
      if (!allowed) {
        const error = new Error("Muitas tentativas de criar pedido. Aguarde 15 minutos e tente novamente.");
        error.code = "order_rate_limit_exceeded";
        error.status = 429;
        throw error;
      }
    }
    const orderDraft = await buildOrderDraft(payload);
    if (demoSession) {
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
    const accountSession = await getAccountSession();
    const order = await createOrder(orderDraft, {
      verifiedAccount: accountSession
    });
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
    // So erros de validacao conhecidos (4xx) expõem a mensagem ao cliente;
    // falhas internas (banco, configuracao) viram 500 generico.
    if (!isClientError(error)) {
      console.error("[orders] falha inesperada ao criar pedido", error);
      return NextResponse.json(
        {
          error: "order_create_failed",
          message: "Não foi possível criar o pedido agora. Tente novamente em instantes."
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        error: error.code || "order_validation_failed",
        message: error.message || "Revise os dados do pedido.",
        ...(Array.isArray(error.details) && error.details.length ? { details: error.details } : {})
      },
      { status: error.status }
    );
    if (error.status === 429) response.headers.set("Retry-After", "900");
    return response;
  }
}

function isClientError(error) {
  return Number.isInteger(error?.status) && error.status >= 400 && error.status < 500;
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


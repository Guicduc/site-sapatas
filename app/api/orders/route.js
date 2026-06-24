import { NextResponse } from "next/server";

import {
  ORDER_ACCESS_COOKIE,
  createOrderAccessToken,
  getOrderAccessCookieOptions
} from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { createOrder } from "@/lib/order-store";
import { buildOrderDraft } from "@/lib/order-validation";
import { notifyOrderCreated } from "@/lib/transactional-email";

export async function POST(request) {
  try {
    const payload = await request.json();
    const orderDraft = await buildOrderDraft(payload);
    const order = await createOrder(orderDraft);
    await notifyOrderCreated(order);

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


import { NextResponse } from "next/server";

import { createOrder } from "@/lib/order-store";
import { buildOrderDraft } from "@/lib/order-validation";

export async function POST(request) {
  try {
    const payload = await request.json();
    const orderDraft = buildOrderDraft(payload);
    const order = await createOrder(orderDraft);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "order_create_failed",
        message: error.message || "Nao foi possivel criar o pedido."
      },
      { status: 400 }
    );
  }
}


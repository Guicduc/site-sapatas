import { NextResponse } from "next/server";

import { getOrderById } from "@/lib/order-store";

export async function GET(_request, { params }) {
  const resolvedParams = await params;
  const order = await getOrderById(resolvedParams.id);

  if (!order) {
    return NextResponse.json(
      { error: "order_not_found", message: "Pedido nao encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ order });
}


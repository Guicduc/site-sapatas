import { NextResponse } from "next/server";

import { getAccountSession, getOrderAccess } from "@/lib/account-session";
import { toAccountOrder } from "@/lib/account-view";
import { getOrderById, getOrderForEmail } from "@/lib/order-store";

export async function GET(_request, { params }) {
  const resolvedParams = await params;
  const [session, orderAccess] = await Promise.all([getAccountSession(), getOrderAccess()]);
  let order = session ? await getOrderForEmail(resolvedParams.id, session.email) : null;

  if (!order && orderAccess?.orderId === resolvedParams.id) {
    order = await getOrderById(resolvedParams.id);
  }

  if (!order) {
    return NextResponse.json(
      { error: "order_not_found", message: "Pedido não encontrado ou acesso expirado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ order: toAccountOrder(order) });
}


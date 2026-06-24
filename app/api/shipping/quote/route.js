import { NextResponse } from "next/server";

import { quoteShippingForCheckout } from "@/lib/shipping";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const result = await quoteShippingForCheckout({
      items: payload.items,
      shippingAddress: payload.shippingAddress,
      couponCode: payload.couponCode
    });

    return NextResponse.json({
      shippingQuote: result.quote,
      commerce: result.commerce
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "shipping_quote_failed",
        message: error.message || "Nao foi possivel cotar o frete."
      },
      { status: 400 }
    );
  }
}

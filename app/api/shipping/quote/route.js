import { NextResponse } from "next/server";

import { assertShippingPayloadLimits, parseLimitedJsonRequest } from "@/lib/order-limits";
import { quoteShippingForCheckout } from "@/lib/shipping";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const payload = await parseLimitedJsonRequest(request);
    assertShippingPayloadLimits(payload);
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
        error: error.code || "shipping_quote_failed",
        message: error.message || "Nao foi possivel cotar o frete."
      },
      { status: error.status || 400 }
    );
  }
}

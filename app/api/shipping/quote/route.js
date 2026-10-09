import { NextResponse } from "next/server";

import { assertShippingPayloadLimits, parseLimitedJsonRequest } from "@/lib/order-limits";
import { getPostalCodeStateValidationMessage } from "@/lib/postal-code-region";
import { quoteShippingForCheckout } from "@/lib/shipping";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const payload = await parseLimitedJsonRequest(request);
    assertShippingPayloadLimits(payload);
    const regionMessage = getPostalCodeStateValidationMessage(payload.shippingAddress || {});
    if (regionMessage) {
      return NextResponse.json(
        { error: "invalid_shipping_region", message: regionMessage },
        { status: 422 }
      );
    }
    const result = await quoteShippingForCheckout({
      items: payload.items,
      shippingAddress: payload.shippingAddress,
      couponCode: payload.couponCode,
      customer: payload.customer
    });

    return NextResponse.json({
      shippingQuote: result.quote,
      commerce: result.commerce
    });
  } catch (error) {
    const clientError = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500;
    if (!clientError) {
      console.error("[shipping-quote] falha inesperada na cotacao", error);
    }
    return NextResponse.json(
      {
        error: clientError ? error.code || "shipping_quote_failed" : "shipping_quote_failed",
        message: clientError
          ? error.message || "Nao foi possivel cotar o frete."
          : "Nao foi possivel cotar o frete agora."
      },
      { status: clientError ? error.status : 500 }
    );
  }
}

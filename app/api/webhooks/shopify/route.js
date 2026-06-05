import { NextResponse } from "next/server";

import { recordShopifyUpdate } from "@/lib/order-store";
import {
  getTracoOrderIdFromShopifyOrder,
  mapShopifyFinancialStatus,
  verifyShopifyWebhook
} from "@/lib/shopify";

export async function POST(request) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const topic = request.headers.get("x-shopify-topic") || "";
  const status = mapShopifyFinancialStatus(payload.financial_status);
  const localOrderId = getTracoOrderIdFromShopifyOrder(payload);

  if (!localOrderId) {
    return NextResponse.json({
      received: true,
      ignored: "missing_traco_base_order_id",
      topic
    });
  }

  const order = await recordShopifyUpdate({
    orderId: localOrderId,
    draftOrderId: payload.admin_graphql_api_id || payload.draft_order_id || null,
    shopifyOrderId: String(payload.id || payload.admin_graphql_api_id || ""),
    status,
    amountBrl: payload.total_price ? Number(payload.total_price) : null,
    raw: {
      topic,
      id: payload.id,
      adminGraphqlApiId: payload.admin_graphql_api_id,
      name: payload.name,
      financialStatus: payload.financial_status,
      fulfillmentStatus: payload.fulfillment_status,
      orderStatusUrl: payload.order_status_url,
      noteAttributes: payload.note_attributes || []
    }
  });

  return NextResponse.json({
    received: true,
    topic,
    status,
    orderId: order?.id || null
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "shopify" });
}

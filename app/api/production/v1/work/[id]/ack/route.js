import { NextResponse } from "next/server";

import { assertProductionSystemRequest } from "@/lib/production-handoff-auth";
import { getProductionHandoffHttpError } from "@/lib/production-handoff-http";
import { acknowledgeProductionWork } from "@/lib/production-handoff-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    await assertProductionSystemRequest(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const acknowledgement = await acknowledgeProductionWork({
      ...body,
      workId: id,
      consumerId: request.headers.get("x-production-consumer-id") || body.consumerId
    });
    return json({ acknowledgement });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error) {
  const response = getProductionHandoffHttpError(error);
  return json(response.body, { status: response.status });
}

function json(body, init = {}) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store");
  return response;
}

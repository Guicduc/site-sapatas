import { NextResponse } from "next/server";

import { assertProductionSystemRequest } from "@/lib/production-handoff-auth";
import { getProductionHandoffHttpError } from "@/lib/production-handoff-http";
import { pullProductionWork } from "@/lib/production-handoff-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await assertProductionSystemRequest(request);
    const url = new URL(request.url);
    const result = await pullProductionWork({
      limit: url.searchParams.get("limit") || 10,
      consumerId: request.headers.get("x-production-consumer-id") || "production-system"
    });
    return json(result);
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

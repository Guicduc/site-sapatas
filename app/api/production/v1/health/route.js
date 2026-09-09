import { NextResponse } from "next/server";

import { assertProductionSystemRequest } from "@/lib/production-handoff-auth";
import { getProductionHandoffHttpError } from "@/lib/production-handoff-http";
import { checkProductionHandoffStoreHealth } from "@/lib/production-handoff-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await assertProductionSystemRequest(request);
    const health = await checkProductionHandoffStoreHealth();
    return json({
      ok: health.ok,
      generatedAt: new Date().toISOString(),
      mode: health.mode,
      storeMode: health.storeMode,
      summary: health.summary
    }, { status: health.ok ? 200 : 503 });
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

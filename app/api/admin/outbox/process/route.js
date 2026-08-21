import { NextResponse } from "next/server";

import { assertOutboxProcessorRequest } from "@/lib/outbox-auth";
import { processOutboxBatch } from "@/lib/outbox-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return processRequest(request);
}

export async function POST(request) {
  return processRequest(request);
}

async function processRequest(request) {
  try {
    await assertOutboxProcessorRequest(request);
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const result = await processOutboxBatch({
      limit: body.limit || url.searchParams.get("limit") || 10,
      workerId: body.workerId || request.headers.get("x-vercel-id") || "http-processor"
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error.code || error.message || "outbox_processing_failed";
    return NextResponse.json(
      { error: code, message: error.message || "Não foi possível processar a fila." },
      { status: code === "admin_unauthorized" ? 401 : 500 }
    );
  }
}

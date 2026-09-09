import { NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/admin-api-auth";
import { getOutboxSummary, listOutboxEvents, retryOutboxEvent } from "@/lib/outbox-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await assertAdminRequest(request);
    const url = new URL(request.url);
    const [summary, events] = await Promise.all([
      getOutboxSummary(),
      listOutboxEvents({ limit: url.searchParams.get("limit"), status: url.searchParams.get("status") || "" })
    ]);
    return NextResponse.json({ summary, events });
  } catch (error) {
    return outboxError(error);
  }
}

export async function POST(request) {
  try {
    await assertAdminRequest(request);
    const body = await request.json();
    const event = await retryOutboxEvent(body.eventId);
    return event
      ? NextResponse.json({ retried: true, event })
      : NextResponse.json({ error: "outbox_event_not_retryable" }, { status: 409 });
  } catch (error) {
    return outboxError(error);
  }
}

function outboxError(error) {
  const code = error.code || error.message || "outbox_request_failed";
  return NextResponse.json(
    { error: code, message: error.message || "Não foi possível consultar a fila." },
    { status: code === "admin_unauthorized" ? 401 : 500 }
  );
}

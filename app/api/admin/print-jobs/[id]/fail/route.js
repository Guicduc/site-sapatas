import { NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/admin-api-auth";
import { failPrintJob } from "@/lib/print-job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    await assertAdminRequest(request);
    const { id } = await params;
    const body = await request.json();
    const job = await failPrintJob(id, {
      claimToken: body.claimToken,
      eventId: body.eventId,
      error: body.error,
      retryAfterSeconds: body.retryAfterSeconds
    });
    return NextResponse.json({ job });
  } catch (error) {
    const code = error.code || error.message || "print_job_failure_report_failed";
    const status = code === "admin_unauthorized"
      ? 401
      : code === "print_job_not_found"
        ? 404
        : code === "print_job_claim_conflict"
          ? 409
          : code.startsWith("print_job_")
            ? 400
            : 500;
    return NextResponse.json({ error: code, message: error.message }, { status });
  }
}

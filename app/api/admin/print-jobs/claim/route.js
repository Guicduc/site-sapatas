import { NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/admin-api-auth";
import { claimNextPrintJob } from "@/lib/print-job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await assertAdminRequest(request);
    const body = await request.json().catch(() => ({}));
    const claim = await claimNextPrintJob({
      workerId: body.workerId,
      leaseSeconds: body.leaseSeconds
    });
    return NextResponse.json(claim || { job: null, claimToken: null });
  } catch (error) {
    const code = error.code || error.message || "print_job_claim_failed";
    return NextResponse.json(
      { error: code, message: error.message || "Nao foi possivel reservar o proximo job." },
      { status: code === "admin_unauthorized" ? 401 : 500 }
    );
  }
}

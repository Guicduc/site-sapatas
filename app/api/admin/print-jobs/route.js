import { NextResponse } from "next/server";

import { assertAdminRequest } from "@/lib/admin-api-auth";
import {
  enqueuePrintJob,
  listPrintJobs,
  serializePrintJob,
  summarizePrintJobs
} from "@/lib/print-job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await assertAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const jobs = await listPrintJobs({
      status: searchParams.get("status") || "",
      limit: searchParams.get("limit") || 100
    });
    return NextResponse.json({ jobs: jobs.map(serializePrintJob), summary: summarizePrintJobs(jobs) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    await assertAdminRequest(request);
    const input = await request.json();
    const job = await enqueuePrintJob(input);
    return NextResponse.json({ job: serializePrintJob(job) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error) {
  const code = error.code || error.message || "print_job_request_failed";
  const status = code === "admin_unauthorized" ? 401 : code.startsWith("print_job_invalid") ? 400 : 500;
  return NextResponse.json(
    { error: code, message: error.message || "Nao foi possivel processar a fila de impressao." },
    { status }
  );
}

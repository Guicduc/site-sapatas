import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-session";
import { getIntegrationHealth } from "@/lib/integration-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const token = request.headers.get("x-admin-token") || requestUrl.searchParams.get("token") || "";
  const access = await getAdminAccess(token);

  if (!access.allowed) {
    return NextResponse.json(
      { error: "admin_unauthorized", message: "Acesso administrativo necessario." },
      { status: 401 }
    );
  }

  const health = await getIntegrationHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}

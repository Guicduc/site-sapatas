import { NextResponse } from "next/server";

import { saveCartRecoveryLead } from "@/lib/cart-recovery";
import { isDemoSession } from "@/lib/demo-session";

export const runtime = "nodejs";

const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMaxRequests = 20;
const rateLimitBuckets = new Map();

export async function POST(request) {
  try {
    const payload = await request.json();
    if (await isDemoSession()) {
      return NextResponse.json({
        recovery: {
          id: `demo-${crypto.randomUUID()}`,
          status: payload?.status || "active",
          updatedAt: new Date().toISOString(),
          demo: true
        }
      }, { status: 201 });
    }
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";
    const rateLimitKey = `${ip || "unknown"}:${String(payload?.customer?.email || "").toLowerCase()}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: "cart_recovery_rate_limited", message: "Aguarde antes de salvar este carrinho novamente." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const lead = await saveCartRecoveryLead(payload, {
      userAgent: request.headers.get("user-agent") || "",
      ip
    });

    return NextResponse.json({ recovery: lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "cart_recovery_save_failed",
        message: error.message || "Nao foi possivel salvar o carrinho."
      },
      { status: 400 }
    );
  }
}

function isRateLimited(key) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + rateLimitWindowMs;
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  for (const [bucketKey, item] of rateLimitBuckets) {
    if (item.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }

  return bucket.count > rateLimitMaxRequests;
}

import { timingSafeEqual } from "node:crypto";

import { assertAdminRequest } from "./admin-api-auth.js";

export async function assertOutboxProcessorRequest(request) {
  const bearer = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const processorSecrets = [process.env.OUTBOX_PROCESSOR_SECRET, process.env.CRON_SECRET].filter(Boolean);

  if (processorSecrets.some((secret) => safeEqual(bearer, secret))) {
    return { allowed: true, via: "processor_secret" };
  }
  return assertAdminRequest(request);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

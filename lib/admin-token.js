import { createHash, timingSafeEqual } from "node:crypto";

// Normaliza token vindo de env ou formulario: remove BOM inicial (pitfall do
// `vercel env add` via PowerShell) e espacos/quebras de linha nas pontas.
export function normalizeAdminToken(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function matchesAdminToken(token, {
  expected = process.env.ADMIN_ACCESS_TOKEN,
  nodeEnv = process.env.NODE_ENV
} = {}) {
  const configured = normalizeAdminToken(expected);
  const received = normalizeAdminToken(token);

  if (!configured) {
    // Sem token configurado, o acesso por token so existe fora de producao.
    return nodeEnv !== "production";
  }

  if (!received) return false;

  // Digests de tamanho fixo evitam vazar o tamanho do token e permitem timingSafeEqual.
  return timingSafeEqual(digest(received), digest(configured));
}

import { timingSafeEqual } from "node:crypto";

import { productionHandoffError } from "./production-handoff.js";

export const PRODUCTION_SYSTEM_MODE = Object.freeze({
  DISABLED: "disabled",
  SHADOW: "shadow",
  ACTIVE: "active"
});

export function getProductionSystemMode() {
  return getProductionSystemModeConfig().mode;
}

export function getProductionSystemModeConfig() {
  const value = String(process.env.PRODUCTION_SYSTEM_MODE || PRODUCTION_SYSTEM_MODE.DISABLED)
    .trim()
    .toLowerCase();
  const valid = Object.values(PRODUCTION_SYSTEM_MODE).includes(value);
  return {
    mode: valid ? value : PRODUCTION_SYSTEM_MODE.DISABLED,
    valid,
    configuredValue: value
  };
}

export function hasProductionSystemCredential() {
  return Boolean(String(process.env.PRODUCTION_SYSTEM_TOKEN || "").trim());
}

export function assertProductionSystemRequest(request) {
  const modeConfig = getProductionSystemModeConfig();
  const mode = modeConfig.mode;
  if (!modeConfig.valid) {
    throw productionHandoffError(
      "production_system_mode_invalid",
      "PRODUCTION_SYSTEM_MODE deve ser disabled, shadow ou active."
    );
  }
  if (mode === PRODUCTION_SYSTEM_MODE.DISABLED) {
    throw productionHandoffError(
      "production_system_disabled",
      "A integracao com o sistema de producao esta desativada."
    );
  }

  const configured = String(process.env.PRODUCTION_SYSTEM_TOKEN || "").trim();
  if (!configured) {
    throw productionHandoffError(
      "production_system_not_configured",
      "PRODUCTION_SYSTEM_TOKEN precisa estar configurado."
    );
  }

  const received = String(request?.headers?.get?.("authorization") || "")
    .match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim() || "";
  if (!safeEqual(received, configured)) {
    throw productionHandoffError(
      "production_system_unauthorized",
      "Credencial do sistema de producao invalida."
    );
  }

  return { allowed: true, mode, via: "production_system_token" };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length > 0
    && leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}

// Configuracao do Google Analytics 4. A referencia literal a
// process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID e necessaria para o Next embutir o
// valor no bundle do navegador; sem a variavel nada de GA e carregado.
import { getConfiguredAdsTags, hasAdsTags } from "./ads-config.js";

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

export function normalizeMeasurementId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return MEASUREMENT_ID_PATTERN.test(normalized) ? normalized : "";
}

export function getConfiguredMeasurementId() {
  return normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

export function isAnalyticsConfigured() {
  return Boolean(getConfiguredMeasurementId());
}

// Revisao do inventario de tecnologias opcionais apresentado no aviso de cookies.
// Mudar o inventario (ligar/desligar o GA, ligar as tags de anuncio ou trocar de
// ferramenta) muda a revisao e invalida escolhas anteriores, que voltam a ser pedidas.
// So GA4 continua "ga4-1" para nao pedir de novo a quem ja respondeu antes dos anuncios.
export const COOKIE_INVENTORY_REVISION_BASE = "base";
export const COOKIE_INVENTORY_REVISION_GA4 = "ga4-1";
export const COOKIE_INVENTORY_REVISION_ADS = "ads-1";

export function getCookieInventoryRevision(
  measurementId = getConfiguredMeasurementId(),
  adsTags = getConfiguredAdsTags()
) {
  const parts = [];
  if (normalizeMeasurementId(measurementId)) parts.push(COOKIE_INVENTORY_REVISION_GA4);
  if (hasAdsTags(adsTags)) parts.push(COOKIE_INVENTORY_REVISION_ADS);
  return parts.length ? parts.join("+") : COOKIE_INVENTORY_REVISION_BASE;
}

// Rotas que nunca enviam eventos (GA4 e anuncios): area administrativa e demonstracao.
const EXCLUDED_PATH_PREFIXES = ["/admin", "/demonstracao", "/api"];

export function isAnalyticsExcludedPath(pathname) {
  const path = String(pathname || "/");
  return EXCLUDED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// Cookies criados pelo GA4: _ga (cliente) e _ga_<ID sem "G-"> (sessao).
export function getAnalyticsCookieNames(measurementId) {
  const id = normalizeMeasurementId(measurementId);
  return id ? ["_ga", `_ga_${id.slice(2)}`] : ["_ga"];
}

// ~13 meses, abaixo da retencao de 14 meses configurada no GA4.
export const ANALYTICS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;
export const ANALYTICS_COOKIE_DURATION_LABEL = "13 meses";

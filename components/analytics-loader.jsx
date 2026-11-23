"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ANALYTICS_COOKIE_MAX_AGE_SECONDS,
  getConfiguredMeasurementId,
  isAnalyticsExcludedPath
} from "@/lib/analytics-config";
import { rememberLandingUrl } from "@/lib/ads";
import {
  buildAnalyticsPageLocation,
  clearAnalyticsData,
  sanitizeReferrer,
  setAnalyticsStatus,
  trackPageView
} from "@/lib/analytics";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  hasCookieConsentCategory,
  readCookieConsent
} from "@/lib/cookie-consent";
import { fetchDemoSessionActive } from "@/lib/demo-session-client";
import { ensureGtag, loadGtagScript } from "@/lib/gtag-runtime";

// Guarda (so em memoria) a URL de entrada antes de qualquer navegacao interna, para que
// utm_* e cliques de anuncio nao se percam quando o aceite vier em outra pagina.
if (typeof window !== "undefined") rememberLandingUrl(window.location.href);

// Sem NEXT_PUBLIC_GA_MEASUREMENT_ID nada e renderizado nem carregado.
export function AnalyticsLoader() {
  const measurementId = getConfiguredMeasurementId();
  if (!measurementId) return null;
  return <AnalyticsRuntime measurementId={measurementId} />;
}

function AnalyticsRuntime({ measurementId }) {
  const pathname = usePathname();
  const excluded = isAnalyticsExcludedPath(pathname);
  const [consented, setConsented] = useState(null);
  const [demo, setDemo] = useState(null);

  // Consentimento: leitura inicial, mudancas nesta aba e em outras abas.
  useEffect(() => {
    function sync() {
      setConsented(hasCookieConsentCategory(readCookieConsent(window.localStorage), "analytics"));
    }

    function handleStorage(event) {
      if (event.key === null || event.key === COOKIE_CONSENT_STORAGE_KEY) sync();
    }

    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Sessao de demonstracao nunca e medida. So consulta depois do consentimento.
  useEffect(() => {
    if (!consented || excluded || demo !== null) return undefined;
    let cancelled = false;

    // Sem confirmacao, nao mede (falha conta como demonstracao).
    fetchDemoSessionActive().then((active) => {
      if (!cancelled) setDemo(active);
    });

    return () => {
      cancelled = true;
    };
  }, [consented, excluded, demo]);

  useEffect(() => {
    if (consented === null) return;

    if (!consented) {
      disableAnalytics(measurementId);
      setAnalyticsStatus("blocked");
      return;
    }

    if (excluded || demo === true) {
      pauseAnalytics(measurementId);
      setAnalyticsStatus("blocked");
      return;
    }

    if (demo === null) {
      setAnalyticsStatus("pending");
      return;
    }

    enableAnalytics(measurementId);
    trackPageView();
    setAnalyticsStatus("ready");
  }, [consented, demo, excluded, measurementId, pathname]);

  return null;
}

function enableAnalytics(measurementId) {
  window[`ga-disable-${measurementId}`] = false;
  const gtag = ensureGtag(window);

  if (!window.__baseformaAnalyticsConfigured) {
    window.__baseformaAnalyticsConfigured = true;
    // O GA4 nunca usa sinais de publicidade, mesmo com a categoria "marketing" aceita:
    // conversoes de anuncio vao pela tag propria do Google Ads (components/ads-loader.jsx).
    // page_location vai por destino (config e eventos), nunca por `set` global, para nao
    // tirar o gclid da tag do Google Ads.
    gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: buildAnalyticsPageLocation(window.location.href),
      page_referrer: sanitizeReferrer(document.referrer),
      cookie_expires: ANALYTICS_COOKIE_MAX_AGE_SECONDS,
      cookie_flags: window.location.protocol === "https:" ? "SameSite=Lax;Secure" : "SameSite=Lax"
    });
  }

  gtag("consent", "update", { analytics_storage: "granted" });
  loadGtagScript(measurementId, "ga4", window);
}

// Rotas excluidas e demonstracao: interrompe o envio sem apagar a escolha.
function pauseAnalytics(measurementId) {
  window[`ga-disable-${measurementId}`] = true;
}

// Recusa ou revogacao: interrompe o envio e remove cookies _ga*.
function disableAnalytics(measurementId) {
  window[`ga-disable-${measurementId}`] = true;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
  clearAnalyticsData(window, measurementId);
}

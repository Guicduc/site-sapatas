"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ANALYTICS_COOKIE_MAX_AGE_SECONDS,
  getConfiguredMeasurementId,
  isAnalyticsExcludedPath
} from "@/lib/analytics-config";
import {
  clearAnalyticsData,
  sanitizePageLocation,
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

const SCRIPT_ATTRIBUTE = "data-baseforma-analytics";

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

    fetch("/api/demo-session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setDemo(payload?.active === true);
      })
      .catch(() => {
        // Sem confirmacao, nao mede.
        if (!cancelled) setDemo(true);
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

  if (!window.__baseformaAnalyticsInitialized) {
    window.__baseformaAnalyticsInitialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js exige o objeto `arguments`, nao um array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

    // Consent Mode v2 (modo basico: o script so existe apos o aceite).
    // O site nao usa anuncios: sinais de publicidade ficam sempre negados.
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted"
    });
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: sanitizePageLocation(window.location.href),
      page_referrer: sanitizeReferrer(document.referrer),
      cookie_expires: ANALYTICS_COOKIE_MAX_AGE_SECONDS,
      cookie_flags: window.location.protocol === "https:" ? "SameSite=Lax;Secure" : "SameSite=Lax"
    });
  }

  window.gtag("consent", "update", { analytics_storage: "granted" });
  window.gtag("set", { page_location: sanitizePageLocation(window.location.href) });

  if (!document.querySelector(`script[${SCRIPT_ATTRIBUTE}]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.setAttribute(SCRIPT_ATTRIBUTE, "ga4");
    document.head.appendChild(script);
  }
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

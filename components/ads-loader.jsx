"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  buildFbcCookieValue,
  buildGclCookieValue,
  buildUrlWithoutPaymentParams,
  clearAdsData,
  getLandingUrl,
  isAdsExcludedPath,
  mergeLandingCampaign,
  readAdClickIds,
  rememberLandingUrl,
  sanitizeAdsPageLocation,
  setAdsStatus,
  trackAdsPageView
} from "@/lib/ads";
import { getConfiguredAdsTags, hasAdsTags } from "@/lib/ads-config";
import { sanitizeReferrer } from "@/lib/analytics";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  hasCookieConsentCategory,
  readCookieConsent
} from "@/lib/cookie-consent";
import { fetchDemoSessionActive } from "@/lib/demo-session-client";
import { ensureGtag, loadGtagScript } from "@/lib/gtag-runtime";

if (typeof window !== "undefined") rememberLandingUrl(window.location.href);

const META_SCRIPT_ATTRIBUTE = "data-baseforma-ads";
const AD_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
// Valores embutidos no build: um objeto estavel evita reexecutar o efeito (e repetir o
// PageView) a cada re-render do layout, como em router.refresh().
const CONFIGURED_TAGS = getConfiguredAdsTags();

// Sem NEXT_PUBLIC_GOOGLE_ADS_ID nem NEXT_PUBLIC_META_PIXEL_ID nada e renderizado.
export function AdsLoader() {
  if (!hasAdsTags(CONFIGURED_TAGS)) return null;
  return <AdsRuntime tags={CONFIGURED_TAGS} />;
}

function AdsRuntime({ tags }) {
  const pathname = usePathname();
  const excluded = isAdsExcludedPath(pathname);
  const [consented, setConsented] = useState(null);
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    function sync() {
      setConsented(hasCookieConsentCategory(readCookieConsent(window.localStorage), "marketing"));
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

  useEffect(() => {
    if (!consented || excluded || demo !== null) return undefined;
    let cancelled = false;

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
      disableAds();
      setAdsStatus("blocked");
      return;
    }

    if (excluded || demo === true) {
      pauseAds();
      setAdsStatus("blocked");
      return;
    }

    if (demo === null) {
      setAdsStatus("pending");
      return;
    }

    stripPaymentReturnParams();
    enableAds(tags);
    trackAdsPageView();
    setAdsStatus("ready");
  }, [consented, demo, excluded, pathname, tags]);

  return null;
}

function stripPaymentReturnParams() {
  const cleanUrl = buildUrlWithoutPaymentParams(window.location.href);
  if (cleanUrl) window.history.replaceState(window.history.state, "", cleanUrl);
}

function currentAdsPageLocation() {
  return mergeLandingCampaign(
    sanitizeAdsPageLocation(window.location.href),
    sanitizeAdsPageLocation(getLandingUrl())
  );
}

function enableAds(tags) {
  if (tags.googleAdsId) enableGoogleAds(tags.googleAdsId);
  if (tags.metaPixelId) enableMetaPixel(tags.metaPixelId);
}

function enableGoogleAds(adsId) {
  const gtag = ensureGtag(window);

  gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted"
  });

  if (!window.__baseformaGoogleAdsConfigured) {
    window.__baseformaGoogleAdsConfigured = true;
    restoreGclCookies();
    // Cada evento leva o proprio page_location (lib/ads.js). Sem dados fornecidos pelo
    // usuario: enhanced conversions fica desligado.
    gtag("config", adsId, {
      send_page_view: false,
      page_location: currentAdsPageLocation(),
      page_referrer: sanitizeReferrer(document.referrer),
      allow_enhanced_conversions: false
    });
  }

  loadGtagScript(adsId, "google-ads", window);
}

function enableMetaPixel(pixelId) {
  if (!window.fbq) {
    installMetaPixelStub();
    restoreFbcCookie();
    // Sem configuracao automatica (cliques e metadados de formularios) e sem rastreio
    // automatico de pushState: o site envia o PageView de cada rota.
    window.fbq.disablePushState = true;
    window.fbq("set", "autoConfig", false, pixelId);
    window.fbq("consent", "grant");
    window.fbq("init", pixelId);
  } else {
    window.fbq("consent", "grant");
  }

  if (!document.querySelector(`script[${META_SCRIPT_ATTRIBUTE}]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.setAttribute(META_SCRIPT_ATTRIBUTE, "meta-pixel");
    document.head.appendChild(script);
  }
}

// Fila padrao do Meta Pixel (equivalente ao snippet oficial, sem script inline).
function installMetaPixelStub() {
  const fbq = function fbq() {
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    // eslint-disable-next-line prefer-rest-params
    else fbq.queue.push(arguments);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
}

// O pixel so cria o _fbc quando o fbclid ainda esta na URL. Se o aceite veio depois de uma
// navegacao interna, recria o cookie a partir da URL de entrada (memoria).
function restoreFbcCookie() {
  const { fbclid } = readAdClickIds(getLandingUrl());
  if (!fbclid || readAdClickIds(window.location.href).fbclid) return;
  if (/(?:^|;\s*)_fbc=/.test(document.cookie)) return;

  writeAdCookie("_fbc", buildFbcCookieValue(fbclid));
}

// Mesmo caso para o Google: o conversion linker so le o gclid/gbraid da URL atual.
function restoreGclCookies() {
  const landing = readAdClickIds(getLandingUrl());
  const current = readAdClickIds(window.location.href);
  if (landing.gclid && !current.gclid && !/(?:^|;\s*)_gcl_aw=/.test(document.cookie)) {
    writeAdCookie("_gcl_aw", buildGclCookieValue(landing.gclid));
  }
  if (landing.gbraid && !current.gbraid && !/(?:^|;\s*)_gcl_gb=/.test(document.cookie)) {
    writeAdCookie("_gcl_gb", buildGclCookieValue(landing.gbraid));
  }
}

function writeAdCookie(name, value) {
  if (!value) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Max-Age=${AD_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax${secure}`;
}

// Rotas excluidas e demonstracao: interrompe o envio sem apagar a escolha.
function pauseAds() {
  if (typeof window.fbq === "function") window.fbq("consent", "revoke");
}

// Recusa ou revogacao: nega os sinais de anuncio e remove _gcl_*, _fbp e _fbc.
function disableAds() {
  if (window.__baseformaGtagInitialized && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }
  if (typeof window.fbq === "function") window.fbq("consent", "revoke");
  clearAdsData(window);
}

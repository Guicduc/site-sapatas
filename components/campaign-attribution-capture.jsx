"use client";

import { useEffect } from "react";

import { getLandingUrl, rememberLandingUrl } from "@/lib/ads";
import { isAnalyticsExcludedPath } from "@/lib/analytics-config";
import {
  buildCampaignTouch,
  clearStoredAdClicks,
  readClickIds,
  recordAdClicks,
  recordCampaignTouch
} from "@/lib/campaign-attribution";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasCookieConsentCategory,
  readCookieConsent
} from "@/lib/cookie-consent";

if (typeof window !== "undefined") rememberLandingUrl(window.location.href);

// Registra a origem da visita (utm_*/referencia) para gravar no pedido. Cliques de anuncio
// so sao guardados com a categoria "marketing" aceita e saem na revogacao.
export function CampaignAttributionCapture() {
  useEffect(() => {
    const landing = getLandingUrl() || window.location.href;
    let landingUrl;
    try {
      landingUrl = new URL(landing);
    } catch {
      return undefined;
    }

    const demo = landingUrl.searchParams.get("demo") === "1" || landingUrl.searchParams.has("demonstracao");
    if (isAnalyticsExcludedPath(landingUrl.pathname) || demo) return undefined;

    try {
      recordCampaignTouch(
        window.localStorage,
        buildCampaignTouch({ href: landing, referrer: document.referrer })
      );
    } catch {
      // Sem storage, o pedido segue sem origem.
    }

    function syncAdClicks() {
      try {
        const consent = readCookieConsent(window.localStorage);
        if (!hasCookieConsentCategory(consent, "marketing")) {
          clearStoredAdClicks(window.localStorage);
          return;
        }
        const clicks = readClickIds(landing);
        if (Object.keys(clicks).length > 0) recordAdClicks(window.localStorage, clicks);
      } catch {
        // Storage indisponivel: nada a fazer.
      }
    }

    syncAdClicks();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncAdClicks);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncAdClicks);
  }, []);

  return null;
}

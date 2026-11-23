"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getConfiguredAdsTags, hasAdsTags } from "@/lib/ads-config";
import { isAnalyticsConfigured } from "@/lib/analytics-config";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
  createCookieConsent,
  readCookieConsent,
  writeCookieConsent
} from "@/lib/cookie-consent";

export function CookiePreferences() {
  const analyticsConfigured = isAnalyticsConfigured();
  const adsTags = getConfiguredAdsTags();
  const adsConfigured = hasAdsTags(adsTags);
  const adsVendors = [adsTags.googleAdsId && "Google Ads", adsTags.metaPixelId && "Meta (Facebook e Instagram)"]
    .filter(Boolean)
    .join(" e ");
  const [consent, setConsent] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const consentRef = useRef(null);
  const openerRef = useRef(null);
  const acceptButtonRef = useRef(null);

  useEffect(() => {
    const savedConsent = readCookieConsent(window.localStorage);
    consentRef.current = savedConsent;
    setConsent(savedConsent);
    setOpen(!savedConsent);
    setLoaded(true);

    function openPreferences() {
      openerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      const current = consentRef.current;
      setDraft({ analytics: current?.analytics === true, marketing: current?.marketing === true });
      setCustomizing(false);
      setOpen(true);
      window.requestAnimationFrame(() => acceptButtonRef.current?.focus());
    }

    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
  }, []);

  // `choice`: true/false para todos os opcionais ou { analytics, marketing }. Publicidade sem
  // tag configurada nunca e gravada como aceita.
  function saveChoice(choice) {
    const accepted = typeof choice === "object" && choice
      ? choice
      : { analytics: Boolean(choice), marketing: Boolean(choice) };
    const nextConsent = createCookieConsent({
      analytics: accepted.analytics === true,
      marketing: accepted.marketing === true && adsConfigured
    });
    writeCookieConsent(window.localStorage, nextConsent);
    consentRef.current = nextConsent;
    setConsent(nextConsent);
    setOpen(false);
    setCustomizing(false);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: nextConsent })
    );
    restoreFocus();
  }

  function closePreferences() {
    if (!consentRef.current) return;
    setOpen(false);
    restoreFocus();
  }

  function restoreFocus() {
    window.requestAnimationFrame(() => {
      openerRef.current?.focus();
      openerRef.current = null;
    });
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && consentRef.current) {
      event.preventDefault();
      closePreferences();
    }
  }

  if (!loaded || !open) return null;

  return (
    <div className="cookie-preferences-layer">
      <section
        className="cookie-preferences"
        role={consent ? "dialog" : "region"}
        aria-labelledby="cookie-preferences-title"
        aria-describedby="cookie-preferences-description"
        onKeyDown={handleKeyDown}
      >
        <div className="cookie-preferences__heading">
          <div>
            <p className="eyebrow">Privacidade</p>
            <h2 id="cookie-preferences-title">Cookies e armazenamento local</h2>
          </div>
          {consent && (
            <button
              className="cookie-preferences__close"
              type="button"
              onClick={closePreferences}
              aria-label="Fechar preferências de cookies"
            >
              ×
            </button>
          )}
        </div>

        <p id="cookie-preferences-description">
          {describeOptionalTools({ analyticsConfigured, adsConfigured, adsVendors })}
        </p>

        {consent && (
          <p className="cookie-preferences__status" role="status">
            Escolha atual: {describeChoice(consent, { analyticsConfigured, adsConfigured })}.
          </p>
        )}

        <p className="cookie-preferences__detail">
          {describeDetail({ analyticsConfigured, adsConfigured })}{" "}
          <Link href="/privacidade">Veja o inventário e os prazos</Link>.
        </p>

        {adsConfigured && customizing && (
          <fieldset className="cookie-preferences__choices">
            <legend>Escolha por finalidade</legend>
            {analyticsConfigured && (
              <label>
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))}
                />
                <span>
                  <strong>Medição</strong>
                  Google Analytics 4: visitas e compras de forma agregada.
                </span>
              </label>
            )}
            <label>
              <input
                type="checkbox"
                checked={draft.marketing}
                onChange={(event) => setDraft((current) => ({ ...current, marketing: event.target.checked }))}
              />
              <span>
                <strong>Publicidade</strong>
                {adsVendors}: saber quais anúncios trouxeram visitas e compras e mostrar
                anúncios a quem já visitou o site.
              </span>
            </label>
          </fieldset>
        )}

        <div className="cookie-preferences__actions">
          {adsConfigured && customizing ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => saveChoice(draft)}
            >
              Salvar escolha
            </button>
          ) : (
            <button
              ref={acceptButtonRef}
              className="button button-secondary"
              type="button"
              onClick={() => saveChoice(true)}
            >
              {adsConfigured ? "Aceitar todos" : "Aceitar opcionais"}
            </button>
          )}
          <button
            className="button button-secondary"
            type="button"
            onClick={() => saveChoice(false)}
          >
            Recusar opcionais
          </button>
          {adsConfigured && !customizing && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setCustomizing(true)}
            >
              Escolher por finalidade
            </button>
          )}
        </div>

        <small>
          As funções essenciais continuam nos dois casos. Você pode revisar esta escolha no
          rodapé.
        </small>
      </section>
    </div>
  );
}

function describeOptionalTools({ analyticsConfigured, adsConfigured, adsVendors }) {
  const base = "Usamos tecnologias necessárias para manter o carrinho, proteger sessões e mostrar o pedido.";

  if (adsConfigured && analyticsConfigured) {
    return `${base} Com sua permissão, também usamos o Google Analytics para medir visitas e compras de forma agregada e cookies de publicidade de ${adsVendors} para saber quais anúncios trouxeram visitas e compras.`;
  }

  if (adsConfigured) {
    return `${base} Com sua permissão, também usamos cookies de publicidade de ${adsVendors} para saber quais anúncios trouxeram visitas e compras.`;
  }

  if (analyticsConfigured) {
    return `${base} Com sua permissão, também usamos o Google Analytics para medir visitas e compras de forma agregada. Não usamos cookies de anúncios.`;
  }

  return `${base} Hoje não há cookies de anúncios ou medição ativos.`;
}

function describeDetail({ analyticsConfigured, adsConfigured }) {
  if (adsConfigured) {
    return "Nenhum opcional carrega antes da sua escolha. Nome, e-mail, documento, telefone e endereço não são enviados a essas ferramentas. Recusar ou revogar depois interrompe a coleta e apaga os cookies opcionais deste site.";
  }

  if (analyticsConfigured) {
    return "Aceitar carrega o Google Analytics 4 (cookies _ga), sem Google Signals e sem envio de nome, e-mail, documento ou endereço. Recusar ou revogar depois interrompe a medição e apaga esses cookies.";
  }

  return "Aceitar apenas registra sua escolha atual; nenhuma medição é iniciada hoje. Uma nova ferramenta exigirá outro aviso antes de carregar.";
}

function describeChoice(consent, { analyticsConfigured, adsConfigured }) {
  if (!adsConfigured) {
    return consent.analytics ? "opcionais permitidos" : "somente necessários";
  }

  const allowed = [
    analyticsConfigured && consent.analytics && "medição",
    consent.marketing && "publicidade"
  ].filter(Boolean);

  return allowed.length ? `${allowed.join(" e ")} permitidas` : "somente necessários";
}

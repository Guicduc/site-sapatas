"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_PREFERENCES_OPEN_EVENT,
  createCookieConsent,
  readCookieConsent,
  writeCookieConsent
} from "@/lib/cookie-consent";

export function CookiePreferences() {
  const [consent, setConsent] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
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
      setOpen(true);
      window.requestAnimationFrame(() => acceptButtonRef.current?.focus());
    }

    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
  }, []);

  function saveChoice(analytics) {
    const nextConsent = createCookieConsent(analytics);
    writeCookieConsent(window.localStorage, nextConsent);
    consentRef.current = nextConsent;
    setConsent(nextConsent);
    setOpen(false);
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
          Usamos tecnologias necessárias para manter o carrinho, proteger sessões e mostrar o
          pedido. Hoje não há cookies de anúncios ou medição ativos.
        </p>

        {consent && (
          <p className="cookie-preferences__status" role="status">
            Escolha atual: {consent.analytics ? "opcionais permitidos" : "somente necessários"}.
          </p>
        )}

        <p className="cookie-preferences__detail">
          Aceitar apenas registra sua escolha atual; nenhuma medição é iniciada hoje. Uma nova
          ferramenta exigirá outro aviso antes de carregar. {" "}
          <Link href="/privacidade">Veja o inventário e os prazos</Link>.
        </p>

        <div className="cookie-preferences__actions">
          <button
            ref={acceptButtonRef}
            className="button button-secondary"
            type="button"
            onClick={() => saveChoice(true)}
          >
            Aceitar opcionais
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => saveChoice(false)}
          >
            Recusar opcionais
          </button>
        </div>

        <small>
          As funções essenciais continuam nos dois casos. Você pode revisar esta escolha no
          rodapé.
        </small>
      </section>
    </div>
  );
}

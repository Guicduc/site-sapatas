// Runtime compartilhado do gtag.js entre o GA4 (categoria "analytics") e o Google Ads
// (categoria "marketing"). O script e carregado uma unica vez, por quem receber o aceite
// primeiro; cada destino so recebe `config` depois do proprio aceite (modo basico do
// Consent Mode v2: nada de pings sem consentimento).

export const GTAG_SCRIPT_ATTRIBUTE = "data-baseforma-analytics";

export function ensureGtag(win = window) {
  if (win.__baseformaGtagInitialized) return win.gtag;

  win.__baseformaGtagInitialized = true;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function gtag() {
    // gtag.js exige o objeto `arguments`, nao um array.
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer.push(arguments);
  };

  // Tudo negado por padrao; cada categoria aceita libera apenas os proprios sinais.
  win.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted"
  });
  // Com ad_storage negado, identificadores de clique sao removidos dos pings.
  win.gtag("set", "ads_data_redaction", true);
  win.gtag("js", new Date());
  return win.gtag;
}

// `kind` identifica quem carregou ("ga4" ou "google-ads") apenas para inspecao.
export function loadGtagScript(tagId, kind, win = window) {
  const doc = win.document;
  if (!tagId || doc.querySelector(`script[${GTAG_SCRIPT_ATTRIBUTE}]`)) return;

  const script = doc.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  script.setAttribute(GTAG_SCRIPT_ATTRIBUTE, kind);
  doc.head.appendChild(script);
}

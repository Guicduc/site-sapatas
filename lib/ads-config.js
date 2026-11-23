// Configuracao das tags de anuncios (Google Ads e Meta Pixel). As referencias literais a
// process.env.NEXT_PUBLIC_* sao necessarias para o Next embutir os valores no bundle do
// navegador. Sem nenhuma variavel, nenhuma tag de anuncio e carregada e a categoria
// "marketing" do aviso de cookies nao aparece.

const GOOGLE_ADS_ID_PATTERN = /^AW-\d{6,15}$/;
const GOOGLE_ADS_LABEL_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const META_PIXEL_ID_PATTERN = /^\d{10,20}$/;

export function normalizeGoogleAdsId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return GOOGLE_ADS_ID_PATTERN.test(normalized) ? normalized : "";
}

export function normalizeGoogleAdsLabel(value) {
  const normalized = String(value || "").trim();
  return GOOGLE_ADS_LABEL_PATTERN.test(normalized) ? normalized : "";
}

export function normalizeMetaPixelId(value) {
  const normalized = String(value || "").trim();
  return META_PIXEL_ID_PATTERN.test(normalized) ? normalized : "";
}

export function getConfiguredAdsTags() {
  const googleAdsId = normalizeGoogleAdsId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);

  return {
    googleAdsId,
    // Rotulos so valem com o ID da conta: conversao sem conta nao tem destino.
    googleAdsPurchaseLabel: googleAdsId
      ? normalizeGoogleAdsLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL)
      : "",
    googleAdsLeadLabel: googleAdsId
      ? normalizeGoogleAdsLabel(process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL)
      : "",
    metaPixelId: normalizeMetaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID)
  };
}

export function hasAdsTags(tags = getConfiguredAdsTags()) {
  return Boolean(tags?.googleAdsId || tags?.metaPixelId);
}

export function isAdsConfigured() {
  return hasAdsTags(getConfiguredAdsTags());
}

// Cookies primarios criados pelas tags de anuncio. O Google Ads usa _gcl_* (conversion
// linker); o Meta Pixel usa _fbp (navegador) e _fbc (clique de anuncio).
export const GOOGLE_ADS_COOKIE_PATTERN = /^_gcl_/;
export const META_PIXEL_COOKIE_NAMES = ["_fbp", "_fbc"];
export const ADS_COOKIE_DURATION_LABEL = "90 dias";

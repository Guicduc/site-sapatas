const viaCepBaseUrl = "https://viacep.com.br/ws";

export function sanitizePostalCode(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function formatPostalCode(value) {
  const digits = sanitizePostalCode(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function lookupPostalCode(value) {
  const postalCode = sanitizePostalCode(value);

  if (postalCode.length !== 8) {
    const error = new Error("Informe um CEP com 8 digitos.");
    error.code = "invalid_postal_code";
    error.status = 400;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${viaCepBaseUrl}/${postalCode}/json/`, {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 60 * 60 * 24 * 30
      },
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    const error = new Error("Nao foi possivel consultar o CEP.");
    error.code = "postal_code_provider_failed";
    error.status = 502;
    throw error;
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error("Nao foi possivel consultar o CEP.");
    error.code = "postal_code_provider_failed";
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  if (!data || data.erro) {
    return null;
  }

  return normalizeViaCepAddress(data, postalCode);
}

function normalizeViaCepAddress(data, postalCode) {
  return {
    postalCode: formatPostalCode(data.cep || postalCode),
    postalCodeDigits: postalCode,
    street: cleanText(data.logradouro),
    complement: cleanText(data.complemento),
    district: cleanText(data.bairro),
    city: cleanText(data.localidade),
    state: cleanText(data.uf).toUpperCase().slice(0, 2),
    ibgeCode: cleanText(data.ibge),
    provider: "viacep"
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

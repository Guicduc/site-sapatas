// Mapeia o prefixo de 5 digitos do CEP para a UF pelas faixas padrao dos
// Correios. Modulo puro: roda no servidor (pedido e cotacao) e no navegador
// (aviso no carrinho) sem dependencias.

export const BRAZILIAN_STATES = Object.freeze([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
]);

const brazilianStateSet = new Set(BRAZILIAN_STATES);

// [inicio, fim, UF] com o prefixo de 5 digitos do CEP, limites inclusivos.
const postalCodePrefixRanges = Object.freeze([
  [1000, 19999, "SP"],
  [20000, 28999, "RJ"],
  [29000, 29999, "ES"],
  [30000, 39999, "MG"],
  [40000, 48999, "BA"],
  [49000, 49999, "SE"],
  [50000, 56999, "PE"],
  [57000, 57999, "AL"],
  [58000, 58999, "PB"],
  [59000, 59999, "RN"],
  [60000, 63999, "CE"],
  [64000, 64999, "PI"],
  [65000, 65999, "MA"],
  [66000, 68899, "PA"],
  [68900, 68999, "AP"],
  [69000, 69299, "AM"],
  [69300, 69399, "RR"],
  [69400, 69899, "AM"],
  [69900, 69999, "AC"],
  [70000, 72799, "DF"],
  [72800, 72999, "GO"],
  [73000, 73699, "DF"],
  [73700, 76799, "GO"],
  [76800, 76999, "RO"],
  [77000, 77999, "TO"],
  [78000, 78899, "MT"],
  // Faixa historica de Rondonia (antes de 76800); mantida para nao recusar
  // CEPs antigos ainda aceitos pelos Correios.
  [78900, 78999, "RO"],
  [79000, 79999, "MS"],
  [80000, 87999, "PR"],
  [88000, 89999, "SC"],
  [90000, 99999, "RS"]
]);

export function normalizeStateCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function isBrazilianState(value) {
  return brazilianStateSet.has(normalizeStateCode(value));
}

// Retorna a UF do CEP (8 digitos) ou "" quando o CEP e incompleto ou esta
// fora das faixas conhecidas.
export function getStateFromPostalCode(postalCode) {
  const digits = String(postalCode || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";

  const prefix = Number(digits.slice(0, 5));
  const range = postalCodePrefixRanges.find(([start, end]) => prefix >= start && prefix <= end);
  return range ? range[2] : "";
}

// Mensagem de erro para CEP/UF inconsistentes, ou "" quando o par e valido.
// So avalia a UF quando ela foi informada; a obrigatoriedade dos campos fica
// com quem chama.
export function getPostalCodeStateValidationMessage({ postalCode, state } = {}) {
  const uf = normalizeStateCode(state);
  const digits = String(postalCode || "").replace(/\D/g, "");

  if (uf && !isBrazilianState(uf)) {
    return "Informe uma UF de entrega válida (sigla de um dos 27 estados).";
  }

  if (digits.length !== 8) return "";

  const expectedState = getStateFromPostalCode(digits);
  if (!expectedState) {
    return "Informe um CEP de entrega válido.";
  }

  if (uf && uf !== expectedState) {
    return `O CEP ${digits.slice(0, 5)}-${digits.slice(5)} pertence a ${expectedState}, mas a UF informada é ${uf}. Revise o CEP ou a UF.`;
  }

  return "";
}

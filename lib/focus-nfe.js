const FOCUS_NFE_PRODUCTION_URL = "https://api.focusnfe.com.br";
const FOCUS_NFE_HOMOLOGATION_URL = "https://homologacao.focusnfe.com.br";
const HOMOLOGATION_RECIPIENT_NAME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
const OTHER_CONTRIBUTION_CSTS = new Set([
  "49", "50", "51", "52", "53", "54", "55", "56", "60", "61", "62", "63", "64", "65", "66", "67",
  "70", "71", "72", "73", "74", "75", "98", "99"
]);

export function normalizeFocusNfeEnvironment(value) {
  const environment = cleanText(value).toLowerCase();

  if (["producao", "production"].includes(environment)) return "producao";
  if (!environment || ["homologacao", "homologation", "sandbox"].includes(environment)) {
    return "homologacao";
  }

  return "";
}

export function isSupportedFocusNfeEnvironment(value) {
  return ["producao", "production", "homologacao", "homologation", "sandbox"]
    .includes(cleanText(value).toLowerCase());
}

export function getFocusNfeBaseUrl(value) {
  return normalizeFocusNfeEnvironment(value) === "producao"
    ? FOCUS_NFE_PRODUCTION_URL
    : FOCUS_NFE_HOMOLOGATION_URL;
}

export function buildFocusNfeReference(orderId) {
  const normalized = cleanText(orderId).replace(/[^a-z0-9]/gi, "");

  if (!normalized) {
    throw invoiceError("focus_nfe_reference_invalid", "Pedido sem referencia fiscal valida.");
  }

  return `BF${normalized}`;
}

export function getOrderIdFromFocusNfeReference(reference) {
  const normalized = cleanText(reference);
  const uuid = normalized.match(/^BF([a-f0-9]{32})$/i)?.[1];

  if (!uuid) return normalized;

  return [
    uuid.slice(0, 8),
    uuid.slice(8, 12),
    uuid.slice(12, 16),
    uuid.slice(16, 20),
    uuid.slice(20)
  ].join("-").toLowerCase();
}

export function buildFocusNfePayload(order, config, { now = new Date() } = {}) {
  const address = order?.metadata?.shippingAddress || {};
  const commerce = order?.metadata?.commerce || {};
  const document = onlyDigits(order?.customer?.document);
  const destinationUf = cleanText(address.state).toUpperCase().slice(0, 2);
  const issuerUf = cleanText(config?.issuerUf).toUpperCase().slice(0, 2);
  const cfop = cleanText(config?.cfop)
    || (destinationUf && destinationUf !== issuerUf ? cleanText(config?.cfopInterstate) : cleanText(config?.cfopIntrastate));
  const rawItems = buildFocusNfeItems(order, config, cfop);
  const productCents = rawItems.map((item) => moneyToCents(item.valor_bruto));
  const productsTotalCents = productCents.reduce((sum, value) => sum + value, 0);
  const requestedDiscountCents = moneyToCents(commerce.discount?.amountBrl || 0);
  const shippingTotalCents = moneyToCents(commerce.shipping?.amountBrl || 0);

  validateFocusNfeData({
    order,
    config,
    address,
    document,
    destinationUf,
    issuerUf,
    cfop,
    rawItems,
    productsTotalCents,
    requestedDiscountCents
  });

  const itemDiscounts = allocateDiscountCents(productCents, requestedDiscountCents);
  const items = rawItems.map((item, index) => {
    const discountCents = itemDiscounts[index];
    const netCents = productCents[index] - discountCents;

    return {
      ...item,
      ...(discountCents > 0 ? { valor_desconto: centsToMoney(discountCents) } : {}),
      ...buildContributionFields("pis", config?.pisCst, config?.pisRatePercent, netCents),
      ...buildContributionFields("cofins", config?.cofinsCst, config?.cofinsRatePercent, netCents)
    };
  });
  const discountTotalCents = itemDiscounts.reduce((sum, value) => sum + value, 0);
  const invoiceTotalCents = productsTotalCents - discountTotalCents + shippingTotalCents;
  const orderTotalCents = moneyToCents(order?.totalBrl);

  if (invoiceTotalCents !== orderTotalCents) {
    throw invoiceError(
      "focus_nfe_total_mismatch",
      "Total fiscal diverge do total do pedido; a NF-e nao foi enviada."
    );
  }

  const environment = normalizeFocusNfeEnvironment(config?.environment);
  const recipientName = environment === "homologacao"
    ? HOMOLOGATION_RECIPIENT_NAME
    : limitText(order?.customer?.name, 60);

  return {
    natureza_operacao: limitText(config?.operationNature, 60),
    data_emissao: formatSaoPauloDateTime(now),
    tipo_documento: 1,
    local_destino: destinationUf !== issuerUf ? 2 : 1,
    finalidade_emissao: 1,
    consumidor_final: 1,
    presenca_comprador: 2,
    cnpj_emitente: onlyDigits(config?.issuerCnpj),
    nome_destinatario: recipientName,
    ...(document.length === 14
      ? { cnpj_destinatario: document }
      : { cpf_destinatario: document }),
    indicador_inscricao_estadual_destinatario: 9,
    logradouro_destinatario: limitText(address.street, 60),
    numero_destinatario: limitText(address.number, 60),
    ...(address.complement ? { complemento_destinatario: limitText(address.complement, 60) } : {}),
    bairro_destinatario: limitText(address.district, 60),
    municipio_destinatario: limitText(address.city, 60),
    uf_destinatario: destinationUf,
    cep_destinatario: onlyDigits(address.postalCode),
    modalidade_frete: 0,
    valor_frete: centsToMoney(shippingTotalCents),
    valor_desconto: centsToMoney(discountTotalCents),
    valor_produtos: centsToMoney(productsTotalCents),
    valor_total: centsToMoney(invoiceTotalCents),
    items
  };
}

function buildFocusNfeItems(order, config, cfop) {
  const orderItems = Array.isArray(order?.items) && order.items.length
    ? order.items
    : [buildFallbackOrderItem(order)];

  return orderItems.map((item, index) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    const totalCents = moneyToCents(item.totalPriceBrl || 0);
    const total = centsToMoney(totalCents);
    const unit = roundDecimal(total / quantity, 10);

    return {
      numero_item: index + 1,
      codigo_produto: limitText(item.sku || item.id || `item-${index + 1}`, 60),
      descricao: limitText(buildItemDescription(item), 120),
      codigo_ncm: onlyDigits(config?.ncm),
      cfop,
      unidade_comercial: "UN",
      quantidade_comercial: quantity,
      valor_unitario_comercial: unit,
      unidade_tributavel: "UN",
      quantidade_tributavel: quantity,
      valor_unitario_tributavel: unit,
      valor_bruto: total,
      icms_origem: Number(config?.productOrigin || 0),
      icms_situacao_tributaria: cleanText(config?.icmsCsosn),
      pis_situacao_tributaria: cleanText(config?.pisCst),
      cofins_situacao_tributaria: cleanText(config?.cofinsCst)
    };
  });
}

function buildFallbackOrderItem(order) {
  const commerce = order?.metadata?.commerce || {};
  const productsTotal = commerce.itemsSubtotalBrl ?? Math.max(
    0,
    Number(order?.totalBrl || 0)
      - Number(commerce.shipping?.amountBrl || 0)
      + Number(commerce.discount?.amountBrl || 0)
  );

  return {
    sku: order?.orderNumber,
    formatName: `Pedido ${order?.orderNumber || "Baseforma"}`,
    quantity: 1,
    totalPriceBrl: productsTotal
  };
}

function validateFocusNfeData({
  order,
  config,
  address,
  document,
  destinationUf,
  issuerUf,
  cfop,
  rawItems,
  productsTotalCents,
  requestedDiscountCents
}) {
  const missing = [];

  if (!order?.id) missing.push("referencia do pedido");
  if (!isSupportedFocusNfeEnvironment(config?.environment)) missing.push("ambiente Focus NFe");
  if (![11, 14].includes(document.length)) missing.push("CPF/CNPJ do destinatario");
  if (!cleanText(order?.customer?.name)) missing.push("nome do destinatario");
  if (onlyDigits(config?.issuerCnpj).length !== 14) missing.push("CNPJ do emitente");
  if (issuerUf.length !== 2) missing.push("UF do emitente");
  if (!cleanText(config?.operationNature)) missing.push("natureza da operacao");
  if (!cleanText(address.street)) missing.push("logradouro");
  if (!cleanText(address.number)) missing.push("numero do endereco");
  if (!cleanText(address.district)) missing.push("bairro");
  if (!cleanText(address.city)) missing.push("municipio");
  if (destinationUf.length !== 2) missing.push("UF do destinatario");
  if (onlyDigits(address.postalCode).length !== 8) missing.push("CEP do destinatario");
  if (!/^\d{4}$/.test(cfop)) missing.push("CFOP");
  if (onlyDigits(config?.ncm).length !== 8) missing.push("NCM");
  if (
    !rawItems.length
    || productsTotalCents <= 0
    || rawItems.some((item) => moneyToCents(item.valor_bruto) <= 0)
  ) {
    missing.push("itens com valor positivo");
  }

  if (missing.length) {
    throw invoiceError(
      "focus_nfe_payload_invalid",
      `Dados fiscais incompletos: ${missing.join(", ")}.`
    );
  }

  if (requestedDiscountCents < 0 || requestedDiscountCents > productsTotalCents) {
    throw invoiceError(
      "focus_nfe_discount_invalid",
      "Desconto fiscal invalido para o total de produtos; a NF-e nao foi enviada."
    );
  }
}

function allocateDiscountCents(itemCents, discountCents) {
  if (!discountCents) return itemCents.map(() => 0);

  const totalCents = itemCents.reduce((sum, value) => sum + value, 0);
  const shares = itemCents.map((value, index) => {
    const exact = discountCents * value / totalCents;
    const floor = Math.floor(exact);
    return { index, value, allocation: floor, remainder: exact - floor };
  });
  let remaining = discountCents - shares.reduce((sum, share) => sum + share.allocation, 0);

  shares
    .slice()
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .forEach((share) => {
      if (remaining > 0 && share.allocation < share.value) {
        shares[share.index].allocation += 1;
        remaining -= 1;
      }
    });

  if (remaining !== 0) {
    throw invoiceError(
      "focus_nfe_discount_allocation_failed",
      "Nao foi possivel ratear o desconto entre os itens da NF-e."
    );
  }

  return shares.map((share) => share.allocation);
}

function buildContributionFields(prefix, cst, ratePercent, netCents) {
  const normalizedCst = cleanText(cst);
  if (!OTHER_CONTRIBUTION_CSTS.has(normalizedCst)) return {};

  const normalizedRate = Math.max(0, Number(ratePercent || 0));
  const base = centsToMoney(netCents);
  const value = roundMoney(base * normalizedRate / 100);

  return {
    [`${prefix}_base_calculo`]: base,
    [`${prefix}_aliquota_porcentual`]: normalizedRate,
    [`${prefix}_valor`]: value
  };
}

function buildItemDescription(item) {
  const measures = Object.entries(item.values || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return [item.formatName || item.categoryName, item.color, item.finish, measures]
    .filter(Boolean)
    .join(" | ") || item.sku || "Produto Baseforma";
}

function formatSaoPauloDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

function limitText(value, maxLength) {
  return cleanText(value).slice(0, maxLength);
}

function onlyDigits(value) {
  return cleanText(value).replace(/\D/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToMoney(value) {
  return value / 100;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function roundDecimal(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function invoiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

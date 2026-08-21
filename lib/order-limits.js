import { createHash } from "node:crypto";

export const MAX_ORDER_BODY_BYTES = 64 * 1024;
export const MAX_ORDER_ITEMS = 30;
export const MAX_ITEM_QUANTITY = 999;
export const MAX_ORDER_QUANTITY = 3000;

export const ORDER_TEXT_LIMITS = Object.freeze({
  customerName: 120,
  customerContact: 160,
  customerEmail: 254,
  customerDocument: 32,
  notes: 2000,
  couponCode: 40,
  addressLine: 160,
  addressNumber: 30,
  addressComplement: 120,
  addressDistrict: 100,
  addressCity: 100,
  itemIdentifier: 120,
  itemLabel: 120,
  itemOption: 60,
  specialRequestField: 1000
});

export async function parseLimitedJsonRequest(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ORDER_BODY_BYTES) {
    throw limitError("request_body_too_large", "A requisição excede o limite de 64 KB.", 413);
  }

  const body = await readLimitedBody(request);

  try {
    return JSON.parse(body);
  } catch {
    throw limitError("invalid_json", "Envie um corpo JSON válido.", 400);
  }
}

async function readLimitedBody(request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_ORDER_BODY_BYTES) {
      await reader.cancel();
      throw limitError("request_body_too_large", "A requisição excede o limite de 64 KB.", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export function getAnonymousOrderRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-forwarded-for")
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || "unknown";
  const clientIp = forwardedFor.split(",")[0].trim().slice(0, 64);
  const userAgent = String(request.headers.get("user-agent") || "unknown").slice(0, 200);
  const fingerprint = createHash("sha256").update(`${clientIp}|${userAgent}`).digest("hex");
  return `order-create:${fingerprint}`;
}

export function assertOrderPayloadLimits(payload) {
  if (!isPlainObject(payload)) {
    throw limitError("invalid_order_payload", "O pedido deve ser um objeto JSON.");
  }

  const customer = isPlainObject(payload.customer) ? payload.customer : payload;
  assertText(customer.name, ORDER_TEXT_LIMITS.customerName, "nome do cliente");
  assertText(customer.contact, ORDER_TEXT_LIMITS.customerContact, "contato do cliente");
  assertText(customer.email, ORDER_TEXT_LIMITS.customerEmail, "email do cliente");
  assertText(customer.document, ORDER_TEXT_LIMITS.customerDocument, "CPF/CNPJ");
  assertText(payload.source, 40, "origem do pedido");
  assertText(payload.replacesOrderId, ORDER_TEXT_LIMITS.itemIdentifier, "pedido substituído");
  assertText(payload.notes, ORDER_TEXT_LIMITS.notes, "observações");
  assertText(payload.couponCode, ORDER_TEXT_LIMITS.couponCode, "cupom");
  assertShippingAddressLimits(payload.shippingAddress);

  if (payload.source === "special_request") {
    const specialRequest = isPlainObject(payload.specialRequest) ? payload.specialRequest : payload;
    for (const [key, value] of Object.entries(specialRequest)) {
      if (typeof value === "string") {
        assertText(value, ORDER_TEXT_LIMITS.specialRequestField, `campo especial ${key}`);
      }
    }
    return;
  }

  assertCartItemsLimits(payload.items);
}

export function assertShippingPayloadLimits(payload) {
  if (!isPlainObject(payload)) {
    throw limitError("invalid_shipping_payload", "A cotação deve ser um objeto JSON.");
  }
  assertCartItemsLimits(payload.items);
  assertShippingAddressLimits(payload.shippingAddress);
  assertText(payload.couponCode, ORDER_TEXT_LIMITS.couponCode, "cupom");
}

export function assertCartItemsLimits(items) {
  if (!Array.isArray(items)) {
    throw limitError("invalid_order_items", "Os itens devem ser enviados em uma lista.");
  }
  if (items.length > MAX_ORDER_ITEMS) {
    throw limitError("too_many_order_items", `O pedido aceita no máximo ${MAX_ORDER_ITEMS} linhas de item.`);
  }

  let totalQuantity = 0;
  for (const [index, item] of items.entries()) {
    if (!isPlainObject(item)) {
      throw limitError("invalid_order_item", `O item ${index + 1} é inválido.`);
    }
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw limitError(
        "invalid_item_quantity",
        `Cada linha aceita uma quantidade inteira entre 1 e ${MAX_ITEM_QUANTITY}.`
      );
    }
    totalQuantity += quantity;
    assertText(item.id, ORDER_TEXT_LIMITS.itemIdentifier, "identificador do item");
    assertText(item.categorySlug, ORDER_TEXT_LIMITS.itemIdentifier, "categoria do item");
    assertText(item.formatSlug, ORDER_TEXT_LIMITS.itemIdentifier, "formato do item");
    assertText(item.categoryName, ORDER_TEXT_LIMITS.itemLabel, "nome da categoria");
    assertText(item.formatName, ORDER_TEXT_LIMITS.itemLabel, "nome do formato");
    assertText(item.sku, ORDER_TEXT_LIMITS.itemIdentifier, "SKU");
    assertText(item.color, ORDER_TEXT_LIMITS.itemOption, "cor");
    assertText(item.finish, ORDER_TEXT_LIMITS.itemOption, "acabamento");
    assertItemValues(item.values, index);
  }

  if (totalQuantity > MAX_ORDER_QUANTITY) {
    throw limitError("order_quantity_too_large", `O pedido aceita no máximo ${MAX_ORDER_QUANTITY} unidades.`);
  }
}

function assertShippingAddressLimits(address) {
  if (address == null) return;
  if (!isPlainObject(address)) {
    throw limitError("invalid_shipping_address", "O endereço de entrega é inválido.");
  }
  assertText(address.postalCode, 16, "CEP");
  assertText(address.street, ORDER_TEXT_LIMITS.addressLine, "logradouro");
  assertText(address.number, ORDER_TEXT_LIMITS.addressNumber, "número do endereço");
  assertText(address.complement, ORDER_TEXT_LIMITS.addressComplement, "complemento");
  assertText(address.district, ORDER_TEXT_LIMITS.addressDistrict, "bairro");
  assertText(address.city, ORDER_TEXT_LIMITS.addressCity, "cidade");
  assertText(address.state, 8, "UF");
}

function assertItemValues(values, itemIndex) {
  if (values == null) return;
  if (!isPlainObject(values)) {
    throw limitError("invalid_item_values", `As medidas do item ${itemIndex + 1} são inválidas.`);
  }
  const entries = Object.entries(values);
  if (entries.length > 20) {
    throw limitError("too_many_item_values", "Cada item aceita no máximo 20 parâmetros.");
  }
  for (const [key, value] of entries) {
    assertText(key, 60, "nome do parâmetro");
    if (typeof value === "string") assertText(value, 60, `valor do parâmetro ${key}`);
    else if (typeof value !== "number" && typeof value !== "boolean") {
      throw limitError("invalid_item_value", `O parâmetro ${key} deve ser número, texto curto ou booleano.`);
    }
  }
}

function assertText(value, maximum, label) {
  if (value == null) return;
  if (typeof value !== "string" && typeof value !== "number") {
    throw limitError("invalid_text_field", `O campo ${label} é inválido.`);
  }
  if (String(value).length > maximum) {
    throw limitError("text_field_too_long", `O campo ${label} aceita no máximo ${maximum} caracteres.`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function limitError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

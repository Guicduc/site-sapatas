// @ts-check

/** @param {unknown} value */
export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Narrow untrusted Mercado Pago webhook JSON without pretending it is validated.
 * Detailed business validation remains in the webhook flow.
 * @param {unknown} value
 * @returns {import("./commercial-contract-types.js").MercadoPagoWebhookPayload}
 */
export function parseMercadoPagoWebhookPayload(value) {
  if (!isRecord(value)) return {};
  const payload = /** @type {Record<string, unknown>} */ (value);
  const data = isRecord(payload.data) ? /** @type {Record<string, unknown>} */ (payload.data) : undefined;
  return {
    ...(typeof payload.type === "string" ? { type: payload.type } : {}),
    ...(typeof payload.status === "string" ? { status: payload.status } : {}),
    ...(typeof payload.orderId === "string" ? { orderId: payload.orderId } : {}),
    ...(typeof payload.preferenceId === "string" ? { preferenceId: payload.preferenceId } : {}),
    ...(typeof payload.paymentId === "string" ? { paymentId: payload.paymentId } : {}),
    ...(typeof payload.amountBrl === "number" ? { amountBrl: payload.amountBrl } : {}),
    ...(data && (typeof data.id === "string" || typeof data.id === "number") ? { data: { id: data.id } } : {})
  };
}

/** @param {unknown} value @returns {import("./commercial-contract-types.js").MercadoPagoPaymentPayload} */
export function parseMercadoPagoPaymentPayload(value) {
  if (!isRecord(value)) throw contractError("mercado_pago_payment_invalid", "Mercado Pago returned an invalid payment payload.");
  const payload = /** @type {Record<string, unknown>} */ (value);
  if (typeof payload.id !== "string" && typeof payload.id !== "number") {
    throw contractError("mercado_pago_payment_invalid", "Mercado Pago payment id is missing.");
  }
  const metadata = isRecord(payload.metadata) ? /** @type {Record<string, unknown>} */ (payload.metadata) : undefined;
  return {
    id: payload.id,
    ...(typeof payload.status === "string" ? { status: payload.status } : {}),
    ...(typeof payload.external_reference === "string" ? { external_reference: payload.external_reference } : {}),
    ...(typeof payload.preference_id === "string" ? { preference_id: payload.preference_id } : {}),
    ...(typeof payload.transaction_amount === "number" ? { transaction_amount: payload.transaction_amount } : {}),
    ...(metadata && typeof metadata.order_id === "string" ? { metadata: { order_id: metadata.order_id } } : {})
  };
}

/** @param {string} code @param {string} message */
function contractError(code, message) {
  const error = new Error(message);
  // @ts-expect-error Application errors intentionally carry stable machine codes.
  error.code = code;
  return error;
}

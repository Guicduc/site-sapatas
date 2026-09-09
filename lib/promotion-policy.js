import { createHmac } from "node:crypto";

import { normalizeCouponCode } from "./commerce-adjustments.js";
import { getPromotionEligibilityEvidence } from "./order-store.js";

const genericRejectionMessage = "Este cupom não pode ser aplicado a este pedido.";

// Campaign definitions stay in this server-only module. Never return rule values,
// validity windows, or eligibility evidence to the browser.
const promotions = [
  { id: "traco10-v1", code: "TRACO10", label: "10% no pedido", type: "percent", value: 0.1, minimumSubtotalBrl: 80, maxDiscountBrl: 60 },
  { id: "primeiro15-v1", code: "PRIMEIRO15", label: "15% na primeira compra", type: "percent", value: 0.15, minimumSubtotalBrl: 120, maxDiscountBrl: 75, firstPurchaseOnly: true, singleUse: true },
  { id: "fretegratis-public-v1", code: "FRETEGRATIS", label: "Frete gratuito", type: "free_shipping", minimumSubtotalBrl: 150 },
  { id: "private-shipping-v1", code: "FRETE-AF951F412D", label: "Frete gratuito", type: "free_shipping", minimumSubtotalBrl: 0, singleUse: true, private: true }
];

export async function evaluatePromotion({ couponCode, subtotalBrl, shipping, customer = {} } = {}) {
  const code = normalizeCouponCode(couponCode);
  if (!code) return null;

  const promotion = promotions.find((item) => item.code === code);
  if (!promotion || !isCurrentlyValid(promotion)) return rejected(code);

  const subtotal = roundMoney(Math.max(0, subtotalBrl));
  if (subtotal < promotion.minimumSubtotalBrl) return rejected(code);
  if (promotion.type === "free_shipping" && shipping?.status === "pending_address") {
    return rejected(code);
  }

  let claim = null;
  if (promotion.firstPurchaseOnly || promotion.singleUse) {
    claim = buildPromotionClaim(promotion, customer);
    if (!claim) return rejected(code);
    const evidence = await getPromotionEligibilityEvidence({
      promotionId: claim.promotionId,
      identityHash: claim.identityHash,
      document: normalizeDocument(customer.document)
    });
    if (evidence.hasSuccessfulOrder || evidence.hasActiveClaim) return rejected(code);
  }

  const amountBrl = promotion.type === "percent"
    ? roundMoney(Math.min(subtotal * promotion.value, promotion.maxDiscountBrl || subtotal, subtotal))
    : 0;

  return {
    code,
    label: promotion.label,
    type: promotion.type,
    status: "applied",
    applied: true,
    amountBrl,
    message: promotion.type === "free_shipping" ? "Frete zerado pelo cupom." : "Cupom aplicado.",
    claim
  };
}

export function publicPromotionResult(result) {
  if (!result) return null;
  const { claim: _claim, ...publicResult } = result;
  return publicResult;
}

function buildPromotionClaim(promotion, customer) {
  const document = normalizeDocument(customer.document);
  if (!document) return null;
  const secret = process.env.PROMOTION_IDENTITY_SECRET || process.env.ACCOUNT_SESSION_SECRET;
  if (!secret) return null;
  return {
    promotionId: promotion.id,
    identityHash: createHmac("sha256", secret).update(`promotion-identity-v1:${document}`).digest("hex")
  };
}

function rejected(code) {
  return { code, label: "", type: "none", status: "not_eligible", applied: false, amountBrl: 0, message: genericRejectionMessage, claim: null };
}

function isCurrentlyValid(promotion, now = Date.now()) {
  return (!promotion.validFrom || now >= Date.parse(promotion.validFrom))
    && (!promotion.validUntil || now <= Date.parse(promotion.validUntil));
}

function normalizeDocument(value) {
  const document = String(value || "").replace(/\D/g, "");
  return document.length === 11 || document.length === 14 ? document : "";
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

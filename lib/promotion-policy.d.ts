import type { PromotionResult, PublicPromotionResult } from "./commercial-contract-types.js";
export function evaluatePromotion(input?: { couponCode?: unknown; subtotalBrl?: number; shipping?: { status?: string }; customer?: { document?: unknown } }): Promise<PromotionResult | null>;
export function publicPromotionResult(result: PromotionResult | null): PublicPromotionResult | null;

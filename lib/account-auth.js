import { createHash, randomBytes } from "node:crypto";

import {
  createCustomerAccountSession,
  findCustomerAccount,
  getCustomerAccountSession,
  getOrCreateCustomerAccount,
  linkVerifiedOrderToAccount,
  linkVerifiedOrdersToAccount,
  revokeCustomerAccountSession,
  revokeCustomerAccountSessions,
  setCustomerAccountPassword
} from "./order-store.js";
export { hashPassword, validatePassword, verifyPassword } from "./password-policy.js";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createOpaqueSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export async function issueAccountSession(accountId, { recentAuth = true } = {}) {
  const token = createOpaqueSessionToken();
  await createCustomerAccountSession({ accountId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(), recentAuthAt: recentAuth ? new Date().toISOString() : null });
  return token;
}

export async function getSessionByToken(token) {
  return getCustomerAccountSession(hashSessionToken(token));
}

export async function revokeAccountSession(accountId, token) {
  if (!accountId || !token) return;
  await revokeCustomerAccountSession(accountId, hashSessionToken(token));
}

export async function establishAccountFromVerifiedOrder({ email, orderId }) {
  const account = await getOrCreateCustomerAccount(email);
  if (!(await linkVerifiedOrderToAccount(account.id, orderId, email))) return null;
  await linkVerifiedOrdersToAccount(account.id, email);
  return { account, token: await issueAccountSession(account.id) };
}

export async function updatePassword(accountId, password) {
  const hash = await hashPassword(password);
  return setCustomerAccountPassword(accountId, hash);
}

export { findCustomerAccount, revokeCustomerAccountSessions };

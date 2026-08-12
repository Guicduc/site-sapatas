import argon2 from "argon2";

export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;
const COMMON_PASSWORDS = new Set(["passwordpassword", "123456789012345", "senha123456789012", "qwertyuiopasdfgh"]);

export function validatePassword(password) {
  const value = String(password ?? "");
  if (value.length < MIN_PASSWORD_LENGTH) return "A senha precisa ter pelo menos 15 caracteres.";
  if (value.length > MAX_PASSWORD_LENGTH) return "A senha excede o limite permitido.";
  if (COMMON_PASSWORDS.has(value.normalize("NFKC").toLowerCase())) return "Escolha uma senha menos comum.";
  return null;
}

export async function hashPassword(password) {
  const error = validatePassword(password);
  if (error) throw new Error(error);
  return argon2.hash(String(password), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export const verifyPassword = (hash, password) => Boolean(hash) && argon2.verify(hash, String(password ?? ""));

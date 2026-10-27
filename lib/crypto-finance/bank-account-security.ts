import "server-only";

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const FORMAT_VERSION = "bank-v1";

function getEncryptionKey(): Buffer {
  const secret = process.env.MOOGOLD_AUTH_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "Bank-account encryption requires a configured MOOGOLD_AUTH_SECRET of at least 32 bytes.",
    );
  }

  // Purpose-specific key derivation keeps bank-account encryption separate
  // from other features that use the same application secret.
  return crypto
    .createHash("sha256")
    .update("moogold:bank-account-encryption:v1:", "utf8")
    .update(secret, "utf8")
    .digest();
}

/**
 * Accepts common account-number characters, removes spaces and hyphens,
 * and rejects values outside a conservative 4–34 character range.
 * Country-specific validation must additionally be performed by the
 * payout integration before a transfer can be initiated.
 */
export function normalizeBankAccountNumber(value: string): string {
  if (typeof value !== "string") {
    throw new Error("Bank account number must be text.");
  }

  const normalized = value.trim().replace(/[\s-]/g, "").toUpperCase();

  if (
    normalized.length < 4 ||
    normalized.length > 34 ||
    !/^[A-Z0-9]+$/.test(normalized)
  ) {
    throw new Error("Enter a valid bank account number.");
  }

  return normalized;
}

export function getBankAccountLast4(value: string): string {
  return normalizeBankAccountNumber(value).slice(-4);
}

/**
 * Format: bank-v1:IV:AUTH_TAG:CIPHERTEXT
 * Never log the returned value or expose it to customer-facing responses.
 */
export function encryptBankAccountNumber(value: string): string {
  const normalized = normalizeBankAccountNumber(value);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);

  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Decryption fails closed. Malformed, unsupported, or tampered ciphertext
 * always throws; ciphertext is never returned as though it were plaintext.
 */
export function decryptBankAccountNumber(value: string): string {
  if (typeof value !== "string") {
    throw new Error("Encrypted bank account data is invalid.");
  }

  const parts = value.split(":");

  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Encrypted bank account data has an unsupported format.");
  }

  const [, ivText, tagText, ciphertextText] = parts;

  if (
    !ivText ||
    !tagText ||
    !ciphertextText ||
    !/^[A-Za-z0-9_-]+$/.test(ivText) ||
    !/^[A-Za-z0-9_-]+$/.test(tagText) ||
    !/^[A-Za-z0-9_-]+$/.test(ciphertextText)
  ) {
    throw new Error("Encrypted bank account data is malformed.");
  }

  const iv = Buffer.from(ivText, "base64url");
  const authTag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    ciphertext.length === 0
  ) {
    throw new Error("Encrypted bank account data is malformed.");
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      iv,
    );

    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    // Reject validly decrypted but invalid account-number content.
    return normalizeBankAccountNumber(plaintext);
  } catch {
    throw new Error(
      "Bank account decryption failed. Verify the encryption key and stored data.",
    );
  }
}

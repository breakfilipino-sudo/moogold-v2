import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const secret = process.env.MOOGOLD_AUTH_SECRET;

  if (!secret) {
    throw new Error("MOOGOLD_AUTH_SECRET is not configured.");
  }

  return crypto
    .createHash("sha256")
    .update(secret, "utf8")
    .digest()
    .subarray(0, KEY_LENGTH);
}

/**
 * Encrypts a sensitive gift-card code using AES-256-GCM.
 *
 * Stored format:
 *   iv:authTag:ciphertext
 */
export function encryptGiftCardCode(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Gift-card code cannot be empty.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Decrypts a gift-card code previously encrypted by encryptGiftCardCode().
 */
export function decryptGiftCardCode(value: string): string {
  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted gift-card code.");
  }

  const [ivEncoded, authTagEncoded, encryptedEncoded] = parts;

  const iv = Buffer.from(ivEncoded, "base64url");
  const authTag = Buffer.from(authTagEncoded, "base64url");
  const encrypted = Buffer.from(encryptedEncoded, "base64url");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error("Invalid encrypted gift-card code.");
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Creates a deterministic SHA-256 fingerprint for duplicate detection.
 *
 * The raw code is never used as the database lookup value.
 */
export function hashGiftCardCode(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Gift-card code cannot be empty.");
  }

  return crypto
    .createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex");
}
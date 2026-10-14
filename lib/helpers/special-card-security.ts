import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getSecret(): string {
  const secret = process.env.MOOGOLD_AUTH_SECRET;

  if (!secret) {
    throw new Error("MOOGOLD_AUTH_SECRET is not configured.");
  }

  return secret;
}

function getKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(getSecret(), "utf8")
    .digest();
}

export function encryptSpecialCardValue(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Special Card value cannot be empty.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSpecialCardValue(value: string): string {
  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted Special Card value.");
  }

  const [ivText, tagText, encryptedText] = parts;
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const encrypted = Buffer.from(encryptedText, "base64url");

  if (
    iv.length !== IV_LENGTH ||
    tag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error("Invalid encrypted Special Card value.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function hashSpecialCardVerificationCode(
  code: string,
  submissionId: string,
): string {
  if (!/^\d{6}$/.test(code) || !submissionId.trim()) {
    throw new Error("Invalid Special Card verification input.");
  }

  return crypto
    .createHmac("sha256", getSecret())
    .update(`${submissionId}:${code}`, "utf8")
    .digest("hex");
}

export function verifySpecialCardVerificationCode(
  submittedCode: string,
  submissionId: string,
  expectedHash: string,
): boolean {
  if (
    !/^\d{6}$/.test(submittedCode) ||
    !submissionId.trim() ||
    !/^[a-f0-9]{64}$/i.test(expectedHash)
  ) {
    return false;
  }

  const submittedHash = Buffer.from(
    hashSpecialCardVerificationCode(submittedCode, submissionId),
    "hex",
  );
  const storedHash = Buffer.from(expectedHash, "hex");

  return (
    submittedHash.length === storedHash.length &&
    crypto.timingSafeEqual(submittedHash, storedHash)
  );
}

export function generateSpecialCardVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

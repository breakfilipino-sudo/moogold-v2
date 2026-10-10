import bcrypt from "bcryptjs";

const COMMON_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "0123",
  "3210",
]);

export function isValidPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }

  if (COMMON_PINS.has(pin)) {
    return false;
  }

  // Reject ascending or descending sequences.
  const ascending =
    Number(pin[1]) === Number(pin[0]) + 1 &&
    Number(pin[2]) === Number(pin[1]) + 1 &&
    Number(pin[3]) === Number(pin[2]) + 1;

  const descending =
    Number(pin[1]) === Number(pin[0]) - 1 &&
    Number(pin[2]) === Number(pin[1]) - 1 &&
    Number(pin[3]) === Number(pin[2]) - 1;

  if (ascending || descending) {
    return false;
  }

  return true;
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(
  pin: string,
  hash: string,
) {
  return bcrypt.compare(pin, hash);
}
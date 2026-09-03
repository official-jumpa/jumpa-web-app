import { randomBytes } from "crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateNanoid(size = 8): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export type IdPrefix =
  | "USER"
  | "CHAT"
  | "MSG"
  | "TRAN"
  | "WALL"
  | "RAMP"
  | "SESS"
  | "ACCT"
  | "VRFY"
  | "CARD"
  | "CARDREF"
  | "REFR";

export const generateId = (prefix: IdPrefix | string) => {
  return `${prefix}_${generateNanoid(8)}`;
};

/**
 * Generates a 6 digit alphanumeric referral code
 * @returns returns a string in the format REF-XXXXXX 
 */
export const generateReferralCode = (): string => {
  return `REF-${generateNanoid(6)}`;
};

/**
 * Generates a 12 digit alphanumeric card reference number
 * @returns returns a string in the format  CARDREF_XXXXXXXXXXXX 
 */
export const generateCardReference = () => {
  return `CARDREF_${generateNanoid(12)}`;
};

/**
 * Generates a 24 digit alphanumeric idempotency key
 * @returns returns a string in the format  IDEM_XXXXXXXXXXXXXXXXXXXXXXXX
 * The prefix + the gen key = 24 characters
 */
export const generateIdempotencyKey = () => {
  return `IDEM_${generateNanoid(20)}`;
};
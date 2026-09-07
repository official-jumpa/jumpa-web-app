import { randomBytes } from "crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

function generateNanoid(size = 8): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export type LowercaseIdPrefix =
  | "user"
  | "chat"
  | "msg"
  | "tran"
  | "wall"
  | "ramp"
  | "sess"
  | "acct"
  | "vrfy"
  | "card"
  | "cardref"
  | "refr"
  | "plan"
  | "tx"
  | "act";

export type IdPrefix = LowercaseIdPrefix | Uppercase<LowercaseIdPrefix>;

export const generateId = (prefix: IdPrefix | string) => {
  return `${prefix.toLowerCase()}_${generateNanoid(8)}`;
};

/**
 * Generates a 6 digit alphanumeric referral code
 * @returns returns a string in the format ref-xxxxxx 
 */
export const generateReferralCode = (): string => {
  return `ref-${generateNanoid(6)}`;
};

/**
 * Generates a 12 digit alphanumeric card reference number
 * @returns returns a string in the format  cardref_xxxxxxxxxxxx 
 */
export const generateCardReference = () => {
  return `cardref_${generateNanoid(12)}`;
};

/**
 * Generates a 24 digit alphanumeric idempotency key
 * @returns returns a string in the format  idem_xxxxxxxxxxxxxxxxxxxx
 * The prefix + the gen key = 24 characters
 */
export const generateIdempotencyKey = () => {
  return `idem_${generateNanoid(20)}`;
};
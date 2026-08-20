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
  | "TRAN"
  | "WALL"
  | "RAMP"
  | "SESS"
  | "ACCT"
  | "VRFY";

export const generateId = (prefix: IdPrefix | string) => {
  return `${prefix}_${generateNanoid(8)}`;
};

export const generateReferralCode = (): string => {
  return `REF-${generateNanoid(6)}`;
};

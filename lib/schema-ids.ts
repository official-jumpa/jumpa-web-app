import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid20 = customAlphabet(alphabet, 20); // Idempotency keys
const nanoid16 = customAlphabet(alphabet, 16); // High-volume (deployments, logs, sessions, tx)
const nanoid12 = customAlphabet(alphabet, 12); // Card references
const nanoid8 = customAlphabet(alphabet, 8); // URL-friendly (workspaces, users, wallets)
const nanoid6 = customAlphabet(alphabet, 6); // Referral codes
const nanoidStorage = customAlphabet(alphabet, 24); // For media across the server

/**
 * All database and entity IDs.
 * Defines the prefix, random string length, and description for each model
 */
export const SCHEMA_IDS = {
  // ── 8-Character URL-Facing Entities
  user: { prefix: "user", length: 8, description: "User accounts" },
  wall: { prefix: "wall", length: 8, description: "User crypto wallets" },

  // ── 16-Character High-Scale & Sensitive Entities
  chat: { prefix: "chat", length: 16, description: "Chat session logs" },
  msg: { prefix: "msg", length: 16, description: "Chat messages" },
  tx: { prefix: "tx", length: 16, description: "Transactions" },
  tran: { prefix: "tran", length: 16, description: "Transactions" },
  plan: { prefix: "plan", length: 16, description: "Savings plans" },
  refr: { prefix: "refr", length: 16, description: "Referral records" },
  act: { prefix: "act", length: 16, description: "User activity audit logs" },
  ramp: { prefix: "ramp", length: 16, description: "On/off-ramp records" },
  sess: { prefix: "sess", length: 16, description: "Auth sessions" },
  acct: { prefix: "acct", length: 16, description: "OAuth linked accounts" },
  vrfy: { prefix: "vrfy", length: 16, description: "Verification tokens" },
  card: { prefix: "card", length: 16, description: "Virtual cards" },

  // ── Utility Entities
  cardref: { prefix: "cardref", length: 12, description: "Card references" },
  idem: { prefix: "idem", length: 20, description: "Idempotency keys" },
} as const;

/**
 * Derived type of all valid ID prefixes ('user' | 'wall' | 'chat' | 'msg' | ...)
 */
export type IdPrefix = keyof typeof SCHEMA_IDS;

/**
 * Generates an ID using the schema SSOT config.
 * Automatically chooses random characters depending on the entity type configuration.
 */
export const generateId = (
  prefix: IdPrefix | (string & {}),
  overrideLength?: 8 | 16 | number,
): string => {
  const key = prefix.toLowerCase() as IdPrefix;
  const config = SCHEMA_IDS[key];
  const targetLength = overrideLength ?? config?.length ?? 16;
  const p = config?.prefix ?? prefix.toLowerCase();

  let generator: () => string;
  if (targetLength === 8) generator = nanoid8;
  else if (targetLength === 16) generator = nanoid16;
  else if (targetLength === 6) generator = nanoid6;
  else if (targetLength === 12) generator = nanoid12;
  else if (targetLength === 20) generator = nanoid20;
  else generator = customAlphabet(alphabet, targetLength);

  return `${p}_${generator()}`;
};

/**
 * Returns a validation RegExp for any entity ID prefix.
 * e.g. getIdRegex('user') => /^user_[a-z0-9]{8}$/i
 */
export const getIdRegex = (prefix: IdPrefix): RegExp => {
  const config = SCHEMA_IDS[prefix];
  return new RegExp(`^${config.prefix}_[a-z0-9]{${config.length}}$`, "i");
};

/**
 * Returns a validation RegExp for the unprefixed clean ID slug (e.g. used in URLs /:userId).
 * e.g. getCleanIdRegex('user') => /^[a-z0-9]{8}$/i
 */
export const getCleanIdRegex = (prefix: IdPrefix): RegExp => {
  const config = SCHEMA_IDS[prefix];
  return new RegExp(`^[a-z0-9]{${config.length}}$`, "i");
};

/**
 * Validates whether a given ID string matches the prefix and length defined in SCHEMA_IDS
 */
export const isValidId = (prefix: IdPrefix, id: string): boolean => {
  if (typeof id !== "string") return false;
  return getIdRegex(prefix).test(id);
};

/**
 * Validates whether a given slug string matches the unprefixed ID length defined in SCHEMA_IDS
 */
export const isValidCleanId = (prefix: IdPrefix, slug: string): boolean => {
  if (typeof slug !== "string") return false;
  return getCleanIdRegex(prefix).test(slug);
};

/**
 * Generates a 10-char referral code (ref- + 6 random string)
 */
export const generateReferralCode = (): string => {
  return `ref-${nanoid6()}`;
};

/**
 * Generates a 12 digit alphanumeric card reference number
 * @returns returns a string in the format cardref_xxxxxxxxxxxx 
 */
export const generateCardReference = (): string => {
  return `cardref_${nanoid12()}`;
};

/**
 * Generates a 24 digit alphanumeric idempotency key
 * @returns returns a string in the format idem_xxxxxxxxxxxxxxxxxxxx
 */
export const generateIdempotencyKey = (): string => {
  return `idem_${nanoid20()}`;
};
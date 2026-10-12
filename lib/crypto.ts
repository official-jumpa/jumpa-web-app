import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  hkdfSync,
} from "crypto";
import { argon2id } from "@noble/hashes/argon2.js";
import { environment } from "./environment";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;

// Argon2id Parameters for legacy v1/v2 PIN-derived keys: 32 MB RAM, 3 passes, 1 thread
const ARGON_M = 32768;
const ARGON_T = 3;
const ARGON_P = 1;

/**
 * Derives a 256-bit AES key instantly from WALLET_PEPPER_SECRET using native HKDF (SHA-256)
 */
function deriveKeyHkdf(salt: Buffer): Buffer {
  const pepper = environment.WALLET_PEPPER_SECRET;
  if (!pepper) {
    throw new Error("WALLET_SECRET is missing");
  }

  return Buffer.from(
    hkdfSync(
      "sha256",
      pepper,
      salt,
      "jumpa-wallet-v3-pepper-key",
      KEY_LEN,
    ),
  );
}

/**
 * Derives a 256-bit key from legacy PIN + WALLET_PEPPER_SECRET using Argon2id.
 * Used exclusively for backward compatibility with unmigrated v1 and v2 wallets.
 */
function deriveKeyArgon2idLegacy(pin: string, salt: Uint8Array): Buffer {
  const pepper = environment.WALLET_PEPPER_SECRET;
  const passwordWithPepper = pin + pepper;

  const rawKey = argon2id(passwordWithPepper, salt, {
    m: ARGON_M,
    t: ARGON_T,
    p: ARGON_P,
    dkLen: KEY_LEN,
  });

  return Buffer.from(rawKey);
}

/**
 * Encrypts mnemonic seed phrase or private key using AES-256-GCM.
 * Optional pin parameter allows legacy v2 encryption if explicitly requested.
 */
export function encryptMnemonic(
  mnemonic: string,
  pin?: string,
): { encryptedMnemonic: string; iv: string; salt: string } {
  const salt = randomBytes(32);
  const iv = randomBytes(12);

  // v3 uses instant HKDF; legacy uses Argon2id with pin
  const key = pin ? deriveKeyArgon2idLegacy(pin, salt) : deriveKeyHkdf(salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(mnemonic, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([authTag, encrypted]);

  return {
    encryptedMnemonic: combined.toString("hex"),
    iv: iv.toString("hex"),
    salt: salt.toString("hex"),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext.
 * Supports:
 * - v3 (Default / new / migrated): Uses instant native HKDF (< 0.05ms, no PIN needed)
 * - v1 / v2 (Legacy): Uses Argon2id with PIN
 */
export function decryptMnemonic(
  encryptedMnemonic: string,
  iv: string,
  salt: string,
  pin?: string,
  versionOrWallet?: string | { pinVersion?: string },
): string {
  const combined = Buffer.from(encryptedMnemonic, "hex");
  const authTag = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);

  const saltBuf = Buffer.from(salt, "hex");
  const ivBuf = Buffer.from(iv, "hex");

  const version = typeof versionOrWallet === "object"
    ? versionOrWallet?.pinVersion
    : versionOrWallet;

  // 1. If explicitly marked legacy (v1 or v2) AND pin is present:
  // Run legacy Argon2id directly (never attempts HKDF first, so 0 wasted cycles)
  const isExplicitLegacy = (version === "v1" || version === "v2") && Boolean(pin);
  if (isExplicitLegacy) {
    const legacyKey = deriveKeyArgon2idLegacy(pin!, saltBuf);
    const decipher = createDecipheriv(ALGORITHM, legacyKey, ivBuf);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  }

  // 2. v3 Path (or version not specified):
  // HKDF takes only ~0.05ms. It runs instantly.
  try {
    const v3Key = deriveKeyHkdf(saltBuf);
    const decipher = createDecipheriv(ALGORITHM, v3Key, ivBuf);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch (hkdfErr) {
    // If HKDF fails (e.g. older wallet where caller didn't pass version) and PIN was supplied:
    if (pin) {
      const legacyKey = deriveKeyArgon2idLegacy(pin, saltBuf);
      const decipher = createDecipheriv(ALGORITHM, legacyKey, ivBuf);
      decipher.setAuthTag(authTag);
      return decipher.update(ciphertext) + decipher.final("utf8");
    }
    throw hkdfErr;
  }
}

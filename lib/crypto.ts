import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { argon2id } from "@noble/hashes/argon2.js";
import { environment } from "./environment";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;

// Argon2id Parameters: 32 MB RAM (32768 KB), 3 time passes, 1 thread
const ARGON_M = 32768;
const ARGON_T = 3;
const ARGON_P = 1;

/**
 * Derives a 256-bit key from the user's PIN passcode + WALLET_PEPPER_SECRET
 * using Argon2id algorithm.
 */
function deriveKeyArgon2id(pin: string, salt: Uint8Array): Buffer {
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
 * Encrypts mnemonic seed phrase or private key using AES-256-GCM + Argon2id derived key.
 */
export function encryptMnemonic(
  mnemonic: string,
  pin: string,
): { encryptedMnemonic: string; iv: string; salt: string } {
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const key = deriveKeyArgon2id(pin, salt);

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
 * Decrypts AES-256-GCM ciphertext using Argon2id derived key.
 */
export function decryptMnemonic(
  encryptedMnemonic: string,
  iv: string,
  salt: string,
  pin: string,
): string {
  const combined = Buffer.from(encryptedMnemonic, "hex");
  const authTag = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);

  const saltBuf = Buffer.from(salt, "hex");
  const ivBuf = Buffer.from(iv, "hex");
  const key = deriveKeyArgon2id(pin, saltBuf);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}

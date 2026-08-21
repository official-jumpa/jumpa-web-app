import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";

export const STELLAR_DERIVATION_PATH = "m/44'/148'/0'";

export interface StellarDerivedKeys {
  publicKey: string;
  secretKey: string;
}

/**
 * Derives a sovereign Stellar keypair from a BIP39 mnemonic phrase
 * using the standardized Stellar derivation path m/44'/148'/0'.
 */
export function deriveStellarKeypairFromMnemonic(
  phrase: string,
): StellarDerivedKeys {
  const seed = bip39.mnemonicToSeedSync(phrase.trim());
  const derived = derivePath(STELLAR_DERIVATION_PATH, seed.toString("hex")).key;
  const keypair = StellarKeypair.fromRawEd25519Seed(Buffer.from(derived));

  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/**
 * Derives a Stellar keypair from an imported private key (Secret key starting with 'S' or 64-character hex seed).
 */
export function deriveStellarKeypairFromPrivateKey(
  privateKey: string,
): StellarDerivedKeys {
  const trimmed = privateKey.trim();
  const upper = trimmed.toUpperCase();

  if (upper.startsWith("S") && upper.length === 56) {
    const keypair = StellarKeypair.fromSecret(upper);
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  }

  // Handle raw 32-byte hex (64 hex chars)
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (hex.length === 64 && /^[0-9a-fA-F]{64}$/.test(hex)) {
    const keypair = StellarKeypair.fromRawEd25519Seed(Buffer.from(hex, "hex"));
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  }

  // Fallback to secret parser
  const keypair = StellarKeypair.fromSecret(upper);
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

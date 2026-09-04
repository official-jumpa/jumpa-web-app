import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import {
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
} from "@/lib/chains/stellar";

export interface DerivedWallet {
  addresses: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
  };
  publicKeys: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
  };
}

/**
 * Derives public addresses and raw public keys for ETH, SOL, XLM
 * from a BIP39 mnemonic using viem and standard derivation paths.
 */
export function deriveAddresses(phrase: string): DerivedWallet {
  const account = mnemonicToAccount(phrase);
  const ethAddress = account.address;

  const seed = bip39.mnemonicToSeedSync(phrase);

  // Solana Derivation m/44'/501'/0'/0'
  const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
  const solKeypair = SolanaKeypair.fromSeed(solDerived);
  const solAddress = solKeypair.publicKey.toBase58();

  // Stellar Derivation m/44'/148'/0'
  const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
  const xlmAddress = stellarKeys.publicKey;

  return {
    addresses: {
      eth: ethAddress,
      base: ethAddress,
      sol: solAddress,
      xlm: xlmAddress,
    },
    publicKeys: {
      eth: account.publicKey,
      base: account.publicKey,
      sol: solKeypair.publicKey.toBase58(),
      xlm: xlmAddress,
    },
  };
}

/**
 * Derives wallet addresses from an imported raw private key on a specific network.
 */
export function deriveFromPrivateKey(
  privateKey: string,
  chain = "base",
): DerivedWallet {
  const trimmed = privateKey.trim();

  let ethAddress = "";
  let solAddress = "";
  let xlmAddress = "";

  const chainLower = chain.toLowerCase();

  if (
    chainLower === "xlm" ||
    chainLower === "stellar" ||
    trimmed.startsWith("S") ||
    trimmed.startsWith("s")
  ) {
    try {
      const stellarKeys = deriveStellarKeypairFromPrivateKey(trimmed);
      xlmAddress = stellarKeys.publicKey;
    } catch (err: any) {
      console.error("[DeriveAddresses] Stellar key derivation error:", err);
      throw new Error(
        "Invalid Stellar private key. Please provide a valid 56-character secret key starting with 'S' (e.g. S...) or a 64-character hex seed.",
      );
    }
  } else if (chainLower === "sol" || chainLower === "solana") {
    try {
      // Handle hex or json array
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const secret = Uint8Array.from(JSON.parse(trimmed));
        const keypair = SolanaKeypair.fromSecretKey(secret);
        solAddress = keypair.publicKey.toBase58();
      } else {
        const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
        const secret = Buffer.from(hex, "hex");
        if (secret.length === 64) {
          const keypair = SolanaKeypair.fromSecretKey(secret);
          solAddress = keypair.publicKey.toBase58();
        } else if (secret.length === 32) {
          const keypair = SolanaKeypair.fromSeed(secret);
          solAddress = keypair.publicKey.toBase58();
        } else {
          throw new Error("Invalid Solana private key length");
        }
      }
    } catch {
      throw new Error("Invalid Solana private key");
    }
  } else {
    // EVM (Base, Ethereum, BNB, etc.)
    try {
      const hexKey = (
        trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`
      ) as `0x${string}`;
      const account = privateKeyToAccount(hexKey);
      ethAddress = account.address;
    } catch {
      throw new Error("Invalid EVM private key");
    }
  }

  const primaryAddress = ethAddress || solAddress || xlmAddress;

  return {
    addresses: {
      eth: ethAddress || primaryAddress,
      base: ethAddress || primaryAddress,
      sol: solAddress || primaryAddress,
      xlm: xlmAddress || primaryAddress,
    },
    publicKeys: {
      eth: ethAddress || primaryAddress,
      base: ethAddress || primaryAddress,
      sol: solAddress || primaryAddress,
      xlm: xlmAddress || primaryAddress,
    },
  };
}

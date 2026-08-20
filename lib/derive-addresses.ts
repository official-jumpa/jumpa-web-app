import { mnemonicToAccount } from "viem/accounts";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";
import { HDKey } from "@scure/bip32";

export interface DerivedWallet {
  addresses: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
    btc: string;
  };
  publicKeys: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
    btc: string;
  };
}

/**
 * Derives public addresses and raw public keys for ETH, SOL, XLM, BTC
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
  const stellarDerived = derivePath("m/44'/148'/0'", seed.toString("hex")).key;
  const stellarKeypair = StellarKeypair.fromRawEd25519Seed(
    Buffer.from(stellarDerived),
  );
  const xlmAddress = stellarKeypair.publicKey();

  // Bitcoin Derivation m/84'/0'/0'/0/0
  const btcRoot = HDKey.fromMasterSeed(seed);
  const btcChild = btcRoot.derive("m/84'/0'/0'/0/0");
  const btcPubKeyHex = btcChild.publicKey
    ? Buffer.from(btcChild.publicKey).toString("hex")
    : "";

  return {
    addresses: {
      eth: ethAddress,
      base: ethAddress,
      sol: solAddress,
      xlm: xlmAddress,
      btc: btcPubKeyHex,
    },
    publicKeys: {
      eth: account.publicKey,
      base: account.publicKey,
      sol: solKeypair.publicKey.toBase58(),
      xlm: xlmAddress,
      btc: btcPubKeyHex,
    },
  };
}

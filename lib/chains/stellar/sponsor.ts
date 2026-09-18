import * as StellarSdk from "@stellar/stellar-sdk";
import { environment } from "@/lib/environment";
import { CONTRACT_ADDRESSES } from "@/lib/blockchain";
import { getHorizonServer } from "./client";
import type { StellarDerivedKeys } from "./keypair";

export type StellarKeyInput = StellarSdk.Keypair | StellarDerivedKeys | string;

export function toKeypair(input: StellarKeyInput): StellarSdk.Keypair {
  if (typeof input === "string") {
    return StellarSdk.Keypair.fromSecret(input);
  }
  if ("secretKey" in input && typeof input.secretKey === "string") {
    return StellarSdk.Keypair.fromSecret(input.secretKey);
  }
  return input as StellarSdk.Keypair;
}

export function getSponsorKeypair(): StellarSdk.Keypair | null {
  const secret = environment.SPONSORED_FEE_STELLAR_KEY?.trim();
  if (!secret) return null;
  try {
    return StellarSdk.Keypair.fromSecret(secret);
  } catch (err) {
    console.error("[Stellar Sponsor] Invalid SPONSORED_FEE_STELLAR_KEY:", err);
    return null;
  }
}

export interface ActivationResult {
  success: boolean;
  alreadyActive: boolean;
  txHash: string | null;
  error?: string;
}

export interface TrustlineResult {
  success: boolean;
  alreadyTrustlined: boolean;
  txHash: string | null;
  error?: string;
}

/**
 * Activates a Stellar account using the sponsored fee key by submitting createAccount.
 * Defaults to 1.6 XLM starting balance (1.0 XLM base reserve + 0.5 XLM USDC reserve + 0.1 XLM fee buffer).
 */
export async function activateStellarAccount(
  destinationAddress: string,
  startingBalance = "1.6",
  network: "mainnet" | "testnet" = "mainnet",
): Promise<ActivationResult> {
  const sponsorKey = getSponsorKeypair();
  if (!sponsorKey) {
    return {
      success: false,
      alreadyActive: false,
      txHash: null,
      error: "SPONSORED_FEE_STELLAR_KEY not configured or invalid",
    };
  }

  const server = getHorizonServer(network);

  try {
    // 1. Check if destination account already exists on ledger
    try {
      await server.loadAccount(destinationAddress);
      return { success: true, alreadyActive: true, txHash: null };
    } catch (loadErr: any) {
      if (loadErr?.response?.status !== 404 && loadErr?.status !== 404) {
        throw loadErr;
      }
      // Account does not exist yet (404) -> proceed to create
    }

    // 2. Load sponsor account sequence
    const sponsorAccount = await server.loadAccount(sponsorKey.publicKey());

    const passphrase =
      network === "mainnet"
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    const baseFeeNum = Number(StellarSdk.BASE_FEE) || 100;

    // 3. Build createAccount operation
    const tx = new StellarSdk.TransactionBuilder(sponsorAccount, {
      fee: (baseFeeNum * 2).toString(), // 200 stroops for fast execution
      networkPassphrase: passphrase,
    })
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: destinationAddress,
          startingBalance,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(sponsorKey);

    const res = await server.submitTransaction(tx);
    return {
      success: true,
      alreadyActive: false,
      txHash: res.hash,
    };
  } catch (err: any) {
    const detail =
      err?.response?.data?.extras?.result_codes || err?.message || String(err);
    console.error(`[Stellar Sponsor] Failed to activate ${destinationAddress}:`, detail);
    return {
      success: false,
      alreadyActive: false,
      txHash: null,
      error: typeof detail === "object" ? JSON.stringify(detail) : String(detail),
    };
  }
}

/**
 * Establishes Circle USDC trustline on an existing activated Stellar account.
 * Signed by the user's keypair.
 */
export async function establishUsdcTrustline(
  userKey: StellarKeyInput,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<TrustlineResult> {
  const userKeypair = toKeypair(userKey);
  const server = getHorizonServer(network);
  const usdcIssuer =
    network === "mainnet"
      ? CONTRACT_ADDRESSES.stellar.mainnet.USDC
      : CONTRACT_ADDRESSES.stellar.testnet.USDC;

  const usdcAsset = new StellarSdk.Asset("USDC", usdcIssuer);

  try {
    const account = await server.loadAccount(userKeypair.publicKey());
    const hasTrustline = (account.balances || []).some(
      (b: any) =>
        b.asset_code === "USDC" &&
        b.asset_issuer === usdcIssuer,
    );

    if (hasTrustline) {
      return { success: true, alreadyTrustlined: true, txHash: null };
    }

    const passphrase =
      network === "mainnet"
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    const baseFee = (Number(StellarSdk.BASE_FEE) || 100).toString();

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: baseFee,
      networkPassphrase: passphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: usdcAsset,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(userKeypair);

    const res = await server.submitTransaction(tx);
    return {
      success: true,
      alreadyTrustlined: false,
      txHash: res.hash,
    };
  } catch (err: any) {
    const detail =
      err?.response?.data?.extras?.result_codes || err?.message || String(err);
    console.error(
      `[Stellar Sponsor] Failed to establish USDC trustline on ${userKeypair.publicKey()}:`,
      detail,
    );
    return {
      success: false,
      alreadyTrustlined: false,
      txHash: null,
      error: typeof detail === "object" ? JSON.stringify(detail) : String(detail),
    };
  }
}

/**
 * End-to-end activation helper: Activates account via sponsor, then establishes Circle USDC trustline.
 */
export async function activateAndTrustlineWallet(
  userKey: StellarKeyInput,
  startingBalance = "1.6",
  network: "mainnet" | "testnet" = "mainnet",
): Promise<{
  activated: boolean;
  trustlined: boolean;
  activationTx: string | null;
  trustlineTx: string | null;
  error?: string;
}> {
  const userKeypair = toKeypair(userKey);
  const activation = await activateStellarAccount(
    userKeypair.publicKey(),
    startingBalance,
    network,
  );

  if (!activation.success) {
    return {
      activated: false,
      trustlined: false,
      activationTx: null,
      trustlineTx: null,
      error: activation.error,
    };
  }

  // Small pause for ledger sync if newly created
  if (!activation.alreadyActive) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const trustline = await establishUsdcTrustline(userKeypair, network);

  return {
    activated: true,
    trustlined: trustline.success,
    activationTx: activation.txHash,
    trustlineTx: trustline.txHash,
    error: trustline.error,
  };
}

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

/**
 * Returns the public key where platform fees should be collected on Stellar.
 * Defaults to the sponsor keypair's public key if FEE_WALLET_STELLAR is not specified.
 */
export function getStellarFeeCollectorPubkey(): string | null {
  const configured = environment.FEE_WALLET_STELLAR?.trim();
  if (configured) {
    try {
      if (StellarSdk.StrKey.isValidEd25519PublicKey(configured)) {
        return configured;
      }
    } catch (err) {
      console.error("[Stellar Sponsor] Invalid FEE_WALLET_STELLAR:", err);
    }
  }
  const sponsor = getSponsorKeypair();
  return sponsor ? sponsor.publicKey() : null;
}

/**
 * Returns the configured USD/token fee amount for gas abstraction (default 0.01).
 */
export function getStellarFeeAmount(): number {
  return environment.FEE_USD_AMOUNT_STELLAR || 0.01;
}

/** Maximum fee (in stroops) we're willing to sponsor per transaction — 1 XLM. */
const MAX_SPONSOR_FEE_STROOPS = 10_000_000;

/**
 * Wraps a signed Stellar transaction in a fee bump envelope so the sponsor
 * account pays the fee instead of the user.
 *
 * - If the sponsor key is not configured, returns the original transaction unchanged.
 * - If the inner fee exceeds MAX_SPONSOR_FEE_STROOPS (1 XLM), returns the original.
 * - Returns `{ tx, sponsored }` so callers can adjust UI labels accordingly.
 */
export function wrapWithFeeBump(
  signedTx: StellarSdk.Transaction,
  network: "mainnet" | "testnet" = "mainnet",
): { tx: StellarSdk.FeeBumpTransaction | StellarSdk.Transaction; sponsored: boolean } {
  const sponsorKey = getSponsorKeypair();
  if (!sponsorKey) {
    console.warn("[Stellar Sponsor] SPONSORED_FEE_ wallet not set — user pays fee");
    return { tx: signedTx, sponsored: false };
  }

  // Don't sponsor unusually expensive transactions
  const innerFee = Number(signedTx.fee);
  if (innerFee > MAX_SPONSOR_FEE_STROOPS) {
    console.warn(`Inner fee ${innerFee} exceeds 1 XLM cap — skipping sponsorship`);
    return { tx: signedTx, sponsored: false };
  }

  const passphrase =
    network === "mainnet"
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

  try {
    // Fee bump fee must be >= inner fee. Use 2× base fee or inner fee, whichever is larger.
    const bumpFee = Math.max(innerFee, (Number(StellarSdk.BASE_FEE) || 100) * 2).toString();

    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      sponsorKey,
      bumpFee,
      signedTx,
      passphrase,
    );
    feeBumpTx.sign(sponsorKey);

    return { tx: feeBumpTx, sponsored: true };
  } catch (err) {
    console.warn("Fee bump wrapping failed — falling back to user-paid fee:", err);
    return { tx: signedTx, sponsored: false };
  }
}

/** Fee multiplier for offramp transactions — 1000 stroops (~$0.0001). Prevents
 *  surge-pricing queuing on a busy network. Stellar does NOT refund excess fees. */
const OFFRAMP_FEE_MULTIPLIER = 10;

/**
 * Convenience: wraps a signed tx in a fee bump, then submits to Horizon.
 * Returns the Horizon response plus whether the fee was sponsored.
 *
 * On a 504 Gateway Timeout (Horizon timed out waiting for ledger inclusion),
 * instead of throwing, returns { status: "pending", txHash } so callers can
 * treat the transaction as in-flight rather than failed.
 */
export async function sponsoredSubmit(
  signedTx: StellarSdk.Transaction,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<
  | { status: "confirmed"; response: any; sponsored: boolean }
  | { status: "pending"; txHash: string; sponsored: boolean }
> {
  // Build a fee bump with a higher fee to avoid surge-pricing delays
  const higherFeeTx = rebuildWithHigherFee(signedTx, network);
  const { tx, sponsored } = wrapWithFeeBump(higherFeeTx, network);
  const server = getHorizonServer(network);

  try {
    const response = await server.submitTransaction(tx);
    return { status: "confirmed", response, sponsored };
  } catch (err: any) {
    // Horizon timed out — the tx may still land. Extract the hash from extras.
    const httpStatus = err?.response?.status ?? err?.status;
    const hash =
      err?.response?.data?.extras?.hash ??
      err?.extras?.hash ??
      signedTx.hash().toString("hex");

    if (httpStatus === 504 || httpStatus === 408) {
      console.warn(
        `[Stellar Sponsor] Horizon 504 timeout on tx ${hash}. Returning PENDING — transaction may still land on-chain.`,
      );
      return { status: "pending", txHash: hash, sponsored };
    }

    // Any other error — rethrow
    throw err;
  }
}

/**
 * Rebuilds a signed transaction with a higher fee to improve ledger inclusion
 * during surge pricing. Uses full XDR round-trip to clone the transaction envelope
 * then overwrites only the fee before re-signing.
 */
function rebuildWithHigherFee(
  tx: StellarSdk.Transaction,
  _network: "mainnet" | "testnet",
): StellarSdk.Transaction {
  try {
    const higherFee = Math.max(
      Number(StellarSdk.BASE_FEE) * OFFRAMP_FEE_MULTIPLIER,
      1000,
    );

    // Clone via XDR so we get a proper Transaction (not OperationRecord types)
    const xdr = tx.toEnvelope().toXDR("base64");
    const cloned = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      _network === "mainnet" ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET,
    ) as StellarSdk.Transaction;

    // Overwrite the fee on the inner envelope
    (cloned as any).tx._attributes.fee = higherFee;

    return cloned;
  } catch {
    console.warn("[Stellar Sponsor] rebuildWithHigherFee failed — using original fee");
    return tx;
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

    // Wrap in fee bump so the sponsor pays the fee
    const { tx: finalTx } = wrapWithFeeBump(tx, network);
    const res = await server.submitTransaction(finalTx);
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

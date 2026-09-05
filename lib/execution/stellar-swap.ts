/**
 * lib/execution/stellar-swap.ts
 *
 * Full on-chain Stellar swap pipeline: mnemonic decryption, keypair derivation,
 * transaction building (Soroswap REST → Horizon fallback), signing, submission,
 * and DB persistence. Both the AI chat confirm route and the standalone swap
 * execute route call this
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { decryptMnemonic } from "@/lib/crypto";
import {
  deriveStellarKeypairFromMnemonic,
  getHorizonServer,
} from "@/lib/chains/stellar";
import { buildSwapTransaction } from "@/lib/dex";
import { getExplorerTxUrl } from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Wallet } from "@/models/Wallet";
import type { IWallet } from "@/models/Wallet";
import type { SwapQuote } from "@/lib/dex/types";

export interface SwapExecuteParams {
  wallet: IWallet;
  pin: string;
  /** The raw SwapQuote object returned by fetchSoroswapQuote / getSwapQuote. */
  rawQuote: SwapQuote;
  network: "testnet" | "mainnet";
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  userId: string;
  /** Only set when called from the AI chat confirm route. */
  sessionId?: string;
  messageId?: string;
}

export type SwapExecuteResult =
  | { ok: true; txHash: string; explorerUrl: string }
  | { ok: false; error: string; status: number };

/** Human-readable Horizon operation result code → user-facing message. */
function horizonErrorMessage(err: any): string {
  const resultCodes =
    err?.response?.data?.extras?.result_codes ||
    err?.message ||
    String(err);
  const s = JSON.stringify(resultCodes);

  if (s.includes("op_too_few_offers") || s.includes("few_offers")) {
    return "Swap failed: insufficient liquidity in the orderbook for this pair. Try a smaller amount.";
  }
  if (s.includes("op_underfunded") || s.includes("underfunded")) {
    return "Swap failed: insufficient XLM balance to cover the transaction fee.";
  }
  if (s.includes("op_no_trust") || s.includes("no_trust")) {
    return "Swap failed: your account does not have a trustline for this asset.";
  }
  if (typeof resultCodes === "string") return `Swap failed: ${resultCodes}`;
  return "Swap failed on the Stellar network. Please try again.";
}

/**
 * Execute a Stellar DEX swap end-to-end.
 *
 * 1. Decrypt the wallet mnemonic with the provided PIN.
 * 2. Derive the Stellar keypair.
 * 3. Build the transaction XDR via Soroswap REST → Horizon fallback.
 * 4. Sign and submit to Stellar Horizon.
 * 5. Persist a Transaction record in the DB.
 * 6. Touch wallet.lastUsedAt.
 */
export async function executeSwap(
  params: SwapExecuteParams,
): Promise<SwapExecuteResult> {
  const {
    wallet,
    pin,
    rawQuote,
    network,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    userId,
    sessionId,
    messageId,
  } = params;

  // 1. Decrypt mnemonic
  let sourceKeypair: StellarSdk.Keypair;
  try {
    const phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
    const stellarKeys = deriveStellarKeypairFromMnemonic(phrase);
    sourceKeypair = StellarSdk.Keypair.fromSecret(stellarKeys.secretKey);
  } catch {
    return {
      ok: false,
      error: "Incorrect PIN",
      status: 401,
    };
  }

  const fromAddress =
    sourceKeypair.publicKey() || wallet.addresses?.xlm || wallet.address;

  // 2. Build XDR
  let builtXdr = "";
  try {
    console.log(`[executeSwap] Building XDR for ${fromAmount} ${fromToken} → ${toToken} on Stellar ${network}`);
    const buildResult = await buildSwapTransaction({
      quote: rawQuote,
      fromAddress,
      network,
    });
    builtXdr = buildResult.xdr;
  } catch (buildErr: any) {
    return {
      ok: false,
      error: `Swap transaction build failed: ${buildErr?.message || "Internal error"}`,
      status: 400,
    };
  }

  // 3. Sign and submit
  let txHash = "";
  let explorerUrl = "";
  let horizonRes: any = null;
  try {
    const passphrase =
      network === "mainnet"
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    const tx = StellarSdk.TransactionBuilder.fromXDR(builtXdr, passphrase);
    tx.sign(sourceKeypair);

    const server = getHorizonServer(network);
    horizonRes = await server.submitTransaction(tx);
    txHash = horizonRes.hash;
    explorerUrl = getExplorerTxUrl("stellar", txHash, network === "testnet");
    console.log(`[executeSwap] SUCCESS — txHash: ${txHash}`);
  } catch (signErr: any) {
    const errorMsg = horizonErrorMessage(signErr);
    console.error("[executeSwap] Horizon submission error:", signErr?.response?.data?.extras?.result_codes || signErr?.message);

    // Persist FAILED record
    await connectDB();
    Transaction.create({
      userId,
      walletId: wallet._id,
      sessionId,
      messageId,
      type: "SWAP",
      status: "FAILED",
      chain: "stellar",
      network,
      fromAddress,
      toAddress: fromAddress,
      amount: fromAmount,
      token: fromToken,
      errorMessage: errorMsg,
      executedAt: new Date(),
    }).catch((e) => console.error("[executeSwap] Failed TX log error:", e));

    return { ok: false, error: errorMsg, status: 400 };
  }

  // 4. Persist CONFIRMED record
  await connectDB();
  Transaction.create({
    userId,
    walletId: wallet._id,
    sessionId,
    messageId,
    type: "SWAP",
    status: "CONFIRMED",
    chain: "stellar",
    network,
    fromAddress,
    toAddress: fromAddress,
    amount: fromAmount,
    token: fromToken,
    swapDetails: {
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      protocol: rawQuote.protocol,
    },
    txHash,
    explorerUrl,
    feePaid: (horizonRes as any)?.fee_charged
      ? `${(Number((horizonRes as any).fee_charged) / 10_000_000).toFixed(5)} XLM`
      : "0.00001 XLM",
    executedAt: new Date(),
  }).catch((e) => console.error("[executeSwap] TX log error:", e));

  Wallet.updateOne(
    { _id: wallet._id },
    { $set: { lastUsedAt: new Date() } },
  ).catch(() => {});

  return { ok: true, txHash, explorerUrl };
}

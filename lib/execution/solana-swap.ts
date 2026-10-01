/**
 * lib/execution/solana-swap.ts
 *
 * Full on-chain Solana swap pipeline powered by Jupiter Swap v2:
 * 1. Decrypt wallet mnemonic with user PIN
 * 2. Derive Solana keypair (m/44'/501'/0'/0')
 * 3. Pre-flight balance check on Solana RPC
 * 4. Obtain fresh assembled VersionedTransaction from Jupiter /order
 * 5. Sign transaction with derived Solana keypair
 * 6. Execute and land transaction via Jupiter Beam (/swap/v2/execute)
 * 7. Persist Transaction in MongoDB and touch wallet.lastUsedAt
 */

import { VersionedTransaction, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { decryptMnemonic } from "@/lib/crypto";
import { environment } from "@/lib/environment";
import { getExplorerTxUrl, getSolanaRpcUrl } from "@/lib/blockchain";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Wallet } from "@/models/Wallet";
import type { IWallet } from "@/models/Wallet";
import type { SwapQuote } from "@/lib/dex/types";
import {
  resolveSolanaMint,
  toAtomicSolanaUnits,
  fromAtomicSolanaUnits,
  executeJupiterOrder,
  type JupiterOrderResponse,
} from "@/lib/dex/jupiter/client";

export interface SolanaSwapExecuteParams {
  wallet: IWallet;
  pin: string;
  rawQuote: SwapQuote;
  network?: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  userId: string;
  sessionId?: string;
  messageId?: string;
}

export type SolanaSwapExecuteResult =
  | { ok: true; txHash: string; explorerUrl: string; txStatus: "confirmed" }
  | { ok: false; error: string; status: number };

export async function executeSolanaSwap(
  params: SolanaSwapExecuteParams,
): Promise<SolanaSwapExecuteResult> {
  const {
    wallet,
    pin,
    rawQuote,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    userId,
  } = params;

  // 1. Decrypt mnemonic
  let signer: SolanaKeypair;
  try {
    const phrase = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
    const seed = bip39.mnemonicToSeedSync(phrase);
    const solDerived = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
    signer = SolanaKeypair.fromSeed(solDerived);
  } catch {
    return {
      ok: false,
      error: "Incorrect PIN",
      status: 401,
    };
  }

  const takerAddress = signer.publicKey.toBase58();
  const assetInInfo = resolveSolanaMint(fromToken);
  const assetOutInfo = resolveSolanaMint(toToken);

  // 2. Pre-flight balance verification
  try {
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const neededAtomic = Number(toAtomicSolanaUnits(fromAmount, assetInInfo.decimals));

    if (fromToken.toUpperCase() === "SOL") {
      const lamports = await connection.getBalance(signer.publicKey);
      if (lamports < neededAtomic) {
        return {
          ok: false,
          error: `Insufficient SOL balance. Required: ${fromAmount} SOL`,
          status: 400,
        };
      }
    } else {
      // Check SPL Token balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        signer.publicKey,
        { mint: new PublicKey(assetInInfo.mint) },
      );
      const parsedAmount =
        tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.amount || "0";
      if (Number(parsedAmount) < neededAtomic) {
        return {
          ok: false,
          error: `Insufficient ${fromToken} balance. Required: ${fromAmount}, Available: ${fromAtomicSolanaUnits(parsedAmount, assetInInfo.decimals)}`,
          status: 400,
        };
      }
    }
  } catch (balErr: any) {
    console.warn("[executeSolanaSwap] Pre-flight balance check warning:", balErr?.message);
  }

  // 3. Obtain fresh assembled VersionedTransaction from Jupiter /order
  let orderResponse: JupiterOrderResponse;
  try {
    const apiKey = environment.JUPITER_API_KEY;
    const baseUrl = environment.JUPITER_BASE_URL;

    const amountAtomic = toAtomicSolanaUnits(fromAmount, assetInInfo.decimals);
    const slippageBps = rawQuote.rawQuote?.slippageBps || 50;

    const queryParams = new URLSearchParams({
      inputMint: assetInInfo.mint,
      outputMint: assetOutInfo.mint,
      amount: amountAtomic,
      slippageBps: slippageBps.toString(),
      taker: takerAddress,
    });

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    const res = await fetch(`${baseUrl}/order?${queryParams.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Jupiter swap order failed (${res.status}): ${errText || res.statusText}`,
        status: 400,
      };
    }

    orderResponse = await res.json();

    if (!orderResponse.transaction) {
      const err = orderResponse.errorMessage || (orderResponse.errorCode === 1 ? "Insufficient funds for swap" : "Unable to construct Solana swap transaction");
      return {
        ok: false,
        error: `Swap build failed: ${err}`,
        status: 400,
      };
    }
  } catch (orderErr: any) {
    return {
      ok: false,
      error: `Failed to fetch swap order: ${orderErr?.message || "Network error"}`,
      status: 500,
    };
  }

  // 4. Sign transaction
  let signedTxBase64 = "";
  try {
    const txBytes = Buffer.from(orderResponse.transaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBytes);
    transaction.sign([signer]);
    signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
  } catch (signErr: any) {
    console.error("[executeSolanaSwap] Signing error:", signErr);
    return {
      ok: false,
      error: "Failed to sign Solana swap transaction",
      status: 500,
    };
  }

  // 5. Land transaction via Jupiter (/swap/v2/execute)
  let txHash = "";
  let explorerUrl = "";
  try {
    const execResult = await executeJupiterOrder(signedTxBase64, orderResponse.requestId);

    if (execResult.status !== "Success" || !execResult.signature) {
      return {
        ok: false,
        error: execResult.error || `Solana swap execution failed on-chain (code: ${execResult.code})`,
        status: 400,
      };
    }

    txHash = execResult.signature;
    explorerUrl = getExplorerTxUrl("solana", txHash, false);
    console.log(`[executeSolanaSwap] SUCCESS — txHash: ${txHash} (${explorerUrl})`);
  } catch (execErr: any) {
    console.error("[executeSolanaSwap] Jupiter execution error:", execErr);
    return {
      ok: false,
      error: execErr?.message || "Failed to swap to Solana",
      status: 500,
    };
  }

  // 6. Persist Transaction in MongoDB
  try {
    await connectDB();
    await Transaction.create({
      userId,
      walletId: wallet._id,
      sessionId: params.sessionId,
      messageId: params.messageId,
      type: "SWAP",
      status: "CONFIRMED",
      chain: "solana",
      network: "mainnet",
      fromAddress: takerAddress,
      toAddress: takerAddress,
      amount: fromAmount,
      token: fromToken,
      swapDetails: {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        protocol: rawQuote.protocol || "Jupiter",
      },
      txHash,
      explorerUrl,
      feePaid: "~0.00005 SOL",
    });

    await Wallet.updateOne(
      { _id: wallet._id },
      { $set: { lastUsedAt: new Date() } },
    );
  } catch (dbErr) {
    console.error("[executeSolanaSwap] DB persistence error:", dbErr);
  }

  return {
    ok: true,
    txHash,
    explorerUrl,
    txStatus: "confirmed",
  };
}

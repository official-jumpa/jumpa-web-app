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
  convertToUsd,
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";
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

  // Enforce security daily transaction limit
  try {
    await assertDailyTransactionLimit({
      userId,
      amount: fromAmount,
      tokenOrCurrency: fromToken,
    });
  } catch (limitErr: any) {
    if (isLimitError(limitErr)) {
      return { ok: false, error: limitErr.message, status: 400 };
    }
    throw limitErr;
  }

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
    signer = await SolanaKeypair.fromSeed(solDerived);
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
  const fromTokenUpper = fromToken.toUpperCase();

  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const { getSolanaSponsorKeypair } = await import("@/lib/chains/solana/sponsor");
  const sponsorKeypair = await getSolanaSponsorKeypair();

  // 2. Platform Fee & ATA Surcharge Calculation (from environment.ts)
  let ataNeedsCreation = false;
  try {
    if (assetOutInfo.mint !== "So11111111111111111111111111111111111111112") {
      const { getAssociatedTokenAddress } = await import("@/lib/chains/solana/spl-token");
      const destATA = await getAssociatedTokenAddress(
        new PublicKey(assetOutInfo.mint),
        signer.publicKey,
        true,
      );
      const destAtaInfo = await connection.getAccountInfo(destATA);
      ataNeedsCreation = !destAtaInfo;
    }
  } catch (ataCheckErr) {
    console.warn("[executeSolanaSwap] ATA check warning:", ataCheckErr);
  }

  const baseFeeUsd = environment.FEE_USD_AMOUNT_SOLANA ?? 0.05;
  const ataRentSurchargeUsd = ataNeedsCreation ? 0.3 : 0.0;
  const totalFeeUsd = baseFeeUsd + ataRentSurchargeUsd;

  let feeInToken = totalFeeUsd;
  if (fromTokenUpper === "SOL") {
    const solPrice = (await convertToUsd(1, "SOL").catch(() => 150)) || 150;
    feeInToken = parseFloat((totalFeeUsd / solPrice).toFixed(6));
  } else {
    feeInToken = totalFeeUsd;
  }

  // 3. Pre-flight balance verification & net swap amount resolution
  let actualSwapAmount = parseFloat(fromAmount);
  try {
    if (fromTokenUpper === "SOL") {
      const lamports = await connection.getBalance(signer.publicKey);
      const userSol = Number(lamports) / 1e9;
      const totalNeeded = parseFloat(fromAmount) + feeInToken;

      if (userSol < totalNeeded) {
        if (userSol >= parseFloat(fromAmount)) {
          actualSwapAmount = Math.max(0.001, parseFloat(fromAmount) - feeInToken);
        } else {
          return {
            ok: false,
            error: `Insufficient SOL balance. Required: ${fromAmount} SOL (+ ${feeInToken} SOL fee)`,
            status: 400,
          };
        }
      }
    } else {
      // Check SPL Token balance (No native SOL required!)
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        signer.publicKey,
        { mint: new PublicKey(assetInInfo.mint) },
      );
      const parsedAmount =
        tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      const totalNeeded = parseFloat(fromAmount) + feeInToken;

      if (parsedAmount < totalNeeded) {
        if (parsedAmount >= parseFloat(fromAmount)) {
          actualSwapAmount = Math.max(0.01, parseFloat(fromAmount) - feeInToken);
        } else {
          return {
            ok: false,
            error: `Insufficient ${fromToken} balance. Required: ${fromAmount} (+ ${feeInToken} ${fromToken} fee), Available: ${parsedAmount}`,
            status: 400,
          };
        }
      }
    }
  } catch (balErr: any) {
    console.warn("[executeSolanaSwap] Pre-flight balance check warning:", balErr?.message);
  }

  // 4. Obtain fresh assembled VersionedTransaction from Jupiter /order
  let orderResponse: JupiterOrderResponse;
  try {
    const apiKey = environment.JUPITER_API_KEY;
    const baseUrl = environment.JUPITER_BASE_URL;

    const amountAtomic = toAtomicSolanaUnits(actualSwapAmount.toString(), assetInInfo.decimals);
    const slippageBps = rawQuote.rawQuote?.slippageBps || 50;

    const queryParams = new URLSearchParams({
      inputMint: assetInInfo.mint,
      outputMint: assetOutInfo.mint,
      amount: amountAtomic,
      slippageBps: slippageBps.toString(),
      taker: takerAddress,
    });

    if (sponsorKeypair) {
      queryParams.set("payer", sponsorKeypair.publicKey.toBase58());
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    const res = await fetch(`${baseUrl}/order?${queryParams.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const raw = `Jupiter swap order failed (${res.status}): ${errText || res.statusText}`;
      console.error("[executeSolanaSwap]", raw);
      return {
        ok: false,
        error: "Unable to calculate swap route on Solana. Please try a different amount.",
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

  // 5. Dual-Sign transaction (User as taker + Jumpa as sponsor fee payer)
  let signedTxBase64 = "";
  try {
    const txBytes = Buffer.from(orderResponse.transaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBytes);

    const requiredSignersCount = transaction.message.header.numRequiredSignatures;
    const requiredSignerPubkeys = transaction.message.staticAccountKeys
      .slice(0, requiredSignersCount)
      .map((k) => k.toBase58());

    const signers: SolanaKeypair[] = [];
    if (requiredSignerPubkeys.includes(signer.publicKey.toBase58())) {
      signers.push(signer);
    }

    const sponsorPubkeyBase58 = sponsorKeypair?.publicKey.toBase58();
    if (
      sponsorKeypair &&
      sponsorPubkeyBase58 &&
      requiredSignerPubkeys.includes(sponsorPubkeyBase58)
    ) {
      signers.push(sponsorKeypair);
    }

    await transaction.sign(signers);

    const hasUnsigned = transaction.signatures.some((sig) =>
      sig.every((b) => b === 0),
    );
    if (hasUnsigned) {
      console.error(
        "[executeSolanaSwap] Transaction has unsigned slots after signing. Required:",
        requiredSignerPubkeys,
        "Signers provided:",
        signers.map((s) => s.publicKey.toBase58()),
      );
      return {
        ok: false,
        error: "Unable to fully sign Solana swap transaction (missing required signer)",
        status: 500,
      };
    }

    signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
  } catch (signErr: any) {
    console.error("[executeSolanaSwap] Signing error:", signErr);
    return {
      ok: false,
      error: "Failed to sign Solana swap transaction",
      status: 500,
    };
  }

  // 6. Land transaction via Jupiter Beam (/swap/v2/execute)
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

  // 7. Collect Jumpa platform fee in input token (only after swap has landed on-chain)
  try {
    const { collectSolanaSwapFee } = await import("@/lib/chains/solana/sponsor");
    await collectSolanaSwapFee({
      userKeypair: signer,
      tokenSymbol: fromToken,
      amountToken: feeInToken,
      connection,
    });
  } catch (feeErr) {
    console.warn("[executeSolanaSwap] Platform fee collection warning:", feeErr);
  }

  // 8. Persist Transaction in MongoDB
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
      amountInUsd: await convertToUsd(fromAmount, fromToken),
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
      feePaid: `$${totalFeeUsd.toFixed(2)} (Sponsored)`,
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

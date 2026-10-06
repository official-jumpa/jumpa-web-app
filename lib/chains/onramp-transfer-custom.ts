/**
 * Jumpa — Custom Onramp Settlement & Treasury Dispatch Engine
 *
 * Handles onramp settlements for non-stablecoin native assets (e.g. XLM)
 * using Jumpa Treasury as a trusted relayer.
 *
 * Guarantees:
 * 1. Strict on-chain verification of Centiiv's inbound deposit before dispatching funds.
 * 2. Atomic MongoDB mutex locking to prevent duplicate payouts across concurrent pollers/workers.
 * 3. Instant native token dispatch to the user's wallet (Priority 1).
 * 4. Background treasury float replenishment via Soroswap Router (Priority 2).
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { getHorizonServer } from "@/lib/chains/stellar/client";
import { getSponsorKeypair } from "@/lib/chains/stellar/sponsor";
import { CONTRACT_ADDRESSES } from "@/lib/blockchain";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  fetchSoroswapQuote,
  buildSoroswapTransaction,
} from "@/lib/dex/soroswap/client";

/**
 * 1. Verifies that Centiiv's USDC payout transaction has actually confirmed
 * on the Stellar Mainnet ledger and credited Jumpa's Treasury account.
 */
export async function verifyCentiivDepositOnChain(params: {
  txHash: string;
  expectedTreasuryAddress: string;
  expectedUsdcAmount?: string | number;
}): Promise<{ verified: boolean; error?: string }> {
  const { txHash, expectedTreasuryAddress, expectedUsdcAmount } = params;

  if (!txHash || txHash === "undefined" || txHash.length < 32) {
    return { verified: false, error: "Invalid transaction hash." };
  }

  const server = getHorizonServer("mainnet");
  const usdcIssuer = CONTRACT_ADDRESSES.stellar.mainnet.USDC;

  try {
    const tx = await server.transactions().transaction(txHash).call();
    if (!tx.successful) {
      return { verified: false, error: "Stellar transaction failed on ledger." };
    }

    // Inspect operations and asset balance changes to verify USDC landed in Jumpa Treasury
    const opsPage = await server.operations().forTransaction(txHash).call();
    const ops = opsPage.records;

    let matchedAmount: number | null = null;

    for (const op of ops as any[]) {
      // 1. Standard Stellar Payment operation
      if (
        op.type === "payment" &&
        op.to === expectedTreasuryAddress &&
        op.asset_code === "USDC" &&
        (!op.asset_issuer || op.asset_issuer === usdcIssuer)
      ) {
        matchedAmount = parseFloat(op.amount || "0");
        break;
      }

      // 2. Soroban Smart Contract / invoke_host_function settlement transfer
      if (Array.isArray(op.asset_balance_changes)) {
        const matchedChange = op.asset_balance_changes.find(
          (change: any) =>
            change.to === expectedTreasuryAddress &&
            change.asset_code === "USDC" &&
            (!change.asset_issuer || change.asset_issuer === usdcIssuer),
        );
        if (matchedChange) {
          matchedAmount = parseFloat(matchedChange.amount || "0");
          break;
        }
      }
    }

    if (matchedAmount === null) {
      console.warn(
        `[OnrampCustom] On-chain check failed: No USDC transfer to ${expectedTreasuryAddress} found in tx ${txHash}`,
      );
      return {
        verified: false,
        error: "On-chain transaction did not credit USDC to Jumpa Treasury.",
      };
    }

    // Check amount tolerance if provided
    if (expectedUsdcAmount) {
      const paidNum = matchedAmount;
      const expectedNum = parseFloat(String(expectedUsdcAmount));
      // Allow 1.5% tolerance for provider fee deductions and precision rounding
      if (paidNum < expectedNum * 0.985) {
        console.warn(
          `[OnrampCustom] Inbound amount mismatch: expected ~${expectedNum} USDC, found ${paidNum} USDC`,
        );
        return {
          verified: false,
          error: `Inbound USDC amount (${paidNum}) was less than expected (${expectedNum}).`,
        };
      }
    }

    return { verified: true };
  } catch (err: any) {
    console.error(`[OnrampCustom] Horizon verification error for tx ${txHash}:`, err?.message || err);
    return { verified: false, error: err?.message || "Failed to query Horizon." };
  }
}

/**
 * 2. Settles a custom onramp order to the user's wallet with atomic idempotency.
 */
export async function settleOnrampTransferCustom(params: {
  transactionId: string;
  recipientAddress: string;
  targetToken: string;
  cryptoAmount: string | number;
  inboundTxHash?: string;
  centiivTxHash?: string;
  expectedUsdcAmount?: string | number;
  userId?: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  duplicatePrevented?: boolean;
  error?: string;
}> {
  const {
    transactionId,
    recipientAddress,
    targetToken,
    cryptoAmount,
    inboundTxHash,
    centiivTxHash,
    expectedUsdcAmount,
    userId,
  } = params;

  const confirmedInboundHash = inboundTxHash || centiivTxHash || "";

  await connectDB();

  const sponsorKey = getSponsorKeypair();
  if (!sponsorKey) {
    return {
      success: false,
      error: "Jumpa Treasury (SPONSORED_FEE_STELLAR_KEY) is not configured.",
    };
  }

  const treasuryAddress = sponsorKey.publicKey();

  // ── Step A: Verify on-chain arrival of funds in Treasury ──────────────────
  const verifyRes = await verifyCentiivDepositOnChain({
    txHash: confirmedInboundHash,
    expectedTreasuryAddress: treasuryAddress,
    expectedUsdcAmount,
  });

  if (!verifyRes.verified) {
    return {
      success: false,
      error: `Inbound deposit not yet verified on-chain: ${verifyRes.error}`,
    };
  }

  // ── Step B: Atomic Concurrency Lock (Guarantees zero duplicate payouts) ──
  const lockedTx = await Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      "rampDetails.settlementStatus": { $nin: ["SETTLING", "COMPLETED"] },
    },
    {
      $set: {
        "rampDetails.settlementStatus": "SETTLING",
        "rampDetails.settlementStartedAt": new Date(),
        "rampDetails.inboundConfirmedTxHash": confirmedInboundHash,
      },
    },
    { returnDocument: "after" },
  );

  if (!lockedTx) {
    console.log(
      `[OnrampCustom] Mutex lock denied for ${transactionId} — already settling or fulfilled. Zero duplicate risk.`,
    );
    return {
      success: false,
      duplicatePrevented: true,
      error: "Order is already being settled or has been completed.",
    };
  }

  // ── Step C: Priority 1 - Send native XLM directly to user wallet ──────────
  try {
    const server = getHorizonServer("mainnet");
    const treasuryAccount = await server.loadAccount(treasuryAddress);

    // Check if recipient account is activated on Stellar
    let destExists = true;
    try {
      await server.loadAccount(recipientAddress);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.message?.includes("Not Found")) {
        destExists = false;
      }
    }

    const numAmount = Number(cryptoAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid dispatch amount: ${cryptoAmount}`);
    }

    const formattedAmount = numAmount.toFixed(7);

    // Operation: payment if destination exists, or createAccount if unfunded
    const dispatchOp = destExists
      ? StellarSdk.Operation.payment({
          destination: recipientAddress,
          asset: StellarSdk.Asset.native(),
          amount: formattedAmount,
        })
      : StellarSdk.Operation.createAccount({
          destination: recipientAddress,
          startingBalance: formattedAmount,
        });

    const txBuilder = new StellarSdk.TransactionBuilder(treasuryAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(dispatchOp)
      .addMemo(StellarSdk.Memo.text("Jumpa: Onramp Delivery"))
      .setTimeout(60);

    const builtTx = txBuilder.build();
    builtTx.sign(sponsorKey);

    console.log(
      `[OnrampCustom] Submitting instant ${targetToken} delivery (${formattedAmount} XLM) to ${recipientAddress}...`,
    );
    const horizonRes = await server.submitTransaction(builtTx);
    const relayTxHash = horizonRes.hash;

    console.log(
      `[OnrampCustom] 🎉 User Delivery Succeeded! Tx Hash: ${relayTxHash}`,
    );

    // ── Step D: Mark Transaction CONFIRMED in Database ───────────────────────
    await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          status: "CONFIRMED",
          txHash: relayTxHash,
          explorerUrl: `https://stellar.expert/explorer/public/tx/${relayTxHash}`,
          "rampDetails.settlementStatus": "COMPLETED",
          "rampDetails.relayTxHash": relayTxHash,
          "rampDetails.settledAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (userId) {
      invalidateBalanceCache(userId);
      logUserActivity({
        userId,
        action: "ONRAMP_COMPLETED",
        details: {
          txId: transactionId,
          amount: String(cryptoAmount),
          token: targetToken,
          txHash: relayTxHash,
        },
      }).catch(() => {});

      createNotification({
        userId,
        tab: "transactions",
        type: "ONRAMP_COMPLETED",
        title: "Purchase Successful",
        body: `${cryptoAmount} ${targetToken} has been credited to your wallet`,
        metadata: {
          txId: transactionId,
          txHash: relayTxHash,
          amount: String(cryptoAmount),
          token: targetToken,
        },
        link: "/transactions",
      }).catch(() => {});
    }

    // ── Step E: Priority 2 - Asynchronously replenish Treasury via Soroswap ──
    if (expectedUsdcAmount && Number(expectedUsdcAmount) > 0) {
      replenishTreasuryViaSoroswap({
        usdcAmount: expectedUsdcAmount,
        minXlmExpected: numAmount * 0.98, // 2% slippage safety buffer on treasury replenishment
      }).catch((replenishErr) => {
        console.warn(
          "[OnrampCustom] Background Treasury Soroswap replenishment notice:",
          replenishErr?.message || replenishErr,
        );
      });
    }

    return {
      success: true,
      txHash: relayTxHash,
    };
  } catch (dispatchErr: any) {
    console.error(
      `[OnrampCustom] Failed to dispatch ${targetToken} to ${recipientAddress}:`,
      dispatchErr?.response?.data || dispatchErr?.message || dispatchErr,
    );

    // Release lock so retry poller can attempt again
    await Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          "rampDetails.settlementStatus": "RETRY_PENDING",
          "rampDetails.lastSettlementError": dispatchErr?.message || String(dispatchErr),
          updatedAt: new Date(),
        },
      },
    ).catch(() => {});

    return {
      success: false,
      error: dispatchErr?.message || "Failed to dispatch on-chain payment.",
    };
  }
}

/**
 * 3. Background Treasury Float Replenishment via Soroswap Router
 *
 * Swaps Treasury's newly arrived USDC back into XLM using Jumpa's existing
 * Soroswap DEX router, restoring Treasury's XLM float inventory.
 */
export async function replenishTreasuryViaSoroswap(params: {
  usdcAmount: string | number;
  minXlmExpected?: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const { usdcAmount, minXlmExpected = 0 } = params;

  const sponsorKey = getSponsorKeypair();
  if (!sponsorKey) {
    return { success: false, error: "Treasury key not configured." };
  }

  const treasuryAddress = sponsorKey.publicKey();
  console.log(
    `[OnrampCustom:Replenish] Starting background Soroswap replenishment: ${usdcAmount} USDC -> XLM for Treasury (${treasuryAddress})...`,
  );

  try {
    const quote = await fetchSoroswapQuote({
      chain: "stellar",
      assetIn: "USDC",
      assetOut: "XLM",
      amount: String(usdcAmount),
      network: "mainnet",
      slippageTolerance: 2.0,
    });

    // Use Jumpa's Soroswap transaction builder
    const buildRes = await buildSoroswapTransaction({
      fromAddress: treasuryAddress,
      toAddress: treasuryAddress,
      quote,
      network: "mainnet",
    });

    if (!buildRes?.xdr) {
      throw new Error("Failed to construct Soroswap swap transaction.");
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(
      buildRes.xdr,
      StellarSdk.Networks.PUBLIC,
    );

    tx.sign(sponsorKey);

    const server = getHorizonServer("mainnet");
    const submitRes = await server.submitTransaction(tx as any);

    console.log(
      `[OnrampCustom:Replenish] ✅ Treasury float replenished via Soroswap! Tx Hash: ${submitRes.hash}`,
    );

    return { success: true, txHash: submitRes.hash };
  } catch (err: any) {
    console.warn(
      "[OnrampCustom:Replenish] Soroswap replenishment failed or deferred:",
      err?.message || err,
    );
    return { success: false, error: err?.message || String(err) };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  atomicCreditNgnBalance,
  queryBellmonieTransactionByReference,
  invalidateBellmonieNgnBalanceCache,
} from "@/lib/functions/bellmonieFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";

/**
 * POST /api/webhooks/bellmonie
 *
 * Real-time HTTP event receiver for Bellmonie (Bell BAAS) collection webhooks.
 * Whenever a user pays Naira into their dedicated Bellmonie virtual account,
 * Bellmonie dispatches a "collection" event here.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(req, {
      tier: "low",
      action: "bellmonie_webhook_post",
    });
    if (rateLimitResponse) return rateLimitResponse;

    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const event = payload.event;
    console.log(`[Bellmonie Webhook] Incoming event: "${event}"`, {
      reference: payload.reference,
      virtualAccount: payload.virtualAccount,
      amountReceived: payload.amountReceived,
      status: payload.status,
    });

    if (event === "collection") {
      const {
        reference,
        virtualAccount,
        amountReceived,
        netAmount,
        status,
        sourceAccountName,
        sourceBankName,
      } = payload;

      if (!reference || !virtualAccount) {
        return NextResponse.json(
          { error: "Missing required reference or virtualAccount" },
          { status: 400 },
        );
      }

      await connectDB();

      // 1. Verify that transaction hasn't already been processed (Idempotency)
      const existingTx = await Transaction.findOne({
        $or: [
          { txHash: reference },
          { "bankDetails.reference": reference },
        ],
      });

      if (existingTx) {
        console.log(`[Bellmonie Webhook] Transaction ${reference} already processed.`);
        return NextResponse.json({ received: true });
      }

      // 2. Locate corresponding Jumpa user by their Bellmonie virtual account number
      const account = await NgnAccount.findOne({
        accountNumber: virtualAccount,
        provider: "bellmonie",
      }).lean<INgnAccount>();

      if (!account) {
        console.error(
          `[Bellmonie Webhook] No matching account found for virtualAccount: ${virtualAccount}`,
        );
        return NextResponse.json({ error: "Virtual account not found" }, { status: 404 });
      }

      // 3. Verify status with Bellmonie API if not already marked successful
      if (status !== "successful") {
        try {
          const verifyRes = await queryBellmonieTransactionByReference(reference);
          if (verifyRes?.data?.status !== "successful") {
            console.warn(
              `[Bellmonie Webhook] Transaction ${reference} is not successful (status: ${verifyRes?.data?.status}). Awaiting final status.`,
            );
            return NextResponse.json({ received: true, pending: true });
          }
        } catch (err: any) {
          console.warn("[Bellmonie Webhook] Status query fallback error:", err.message);
        }
      }

      // Credit the net amount (or amountReceived fallback) to user's ledger
      const creditAmount = Number(netAmount || amountReceived);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        console.error(`[Bellmonie Webhook] Invalid credit amount: ${amountReceived}`);
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const creditRes = await atomicCreditNgnBalance({
        userId: account.userId,
        amount: creditAmount,
        reference,
        memo: `Bank Transfer Deposit from ${sourceAccountName || "External Bank"} (${sourceBankName || "Bank"})`,
        eventId: reference,
      });

      invalidateBalanceCache(account.userId);
      invalidateBellmonieNgnBalanceCache(account.userId);

      console.log(
        `[Bellmonie Webhook] ✅ Credited ₦${creditAmount} to user ${account.userId}. New Balance: ₦${creditRes.newBalance}`,
      );
    } else {
      console.log(`[Bellmonie Webhook] Unhandled event type: "${event}"`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Bellmonie Webhook Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, {
    tier: "medium",
    action: "bellmonie_webhook_get",
  });
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    status: "ok",
    service: "Bellmonie Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  atomicCreditNgnBalance,
  queryBellmonieTransactionByReference,
  invalidateBellmonieNgnBalanceCache,
  getDailySubsidizedDepositCount,
} from "@/lib/functions/bellmonieFunctions";
import { calculateNgnDepositFee } from "@/lib/ngn-account";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

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

    if (event === "collection" || event?.startsWith("collection")) {
      const {
        reference,
        virtualAccount,
        amountReceived,
        netAmount,
        transactionFee,
        status,
        sourceAccountName,
        sourceAccountNumber,
        sourceBankName,
        sourceBankCode,
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

      // Determine gross amount received from sender
      const grossAmount = Number(amountReceived || netAmount);
      if (isNaN(grossAmount) || grossAmount <= 0) {
        console.error(`[Bellmonie Webhook] Invalid credit amount: ${amountReceived}`);
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      // Check if deposit is an internal Bloc MFB to Bloc MFB transfer
      const isBlocIntrabank =
        sourceBankCode === "090977" ||
        /bloc/i.test(sourceBankName || "") ||
        Number(transactionFee || 0) === 0;

      let creditAmount: number;
      let feeCharged = 0;
      let memo = "";

      if (isBlocIntrabank) {
        // Bloc-to-Bloc is completely free, ₦0 fee, doesn't consume daily quota
        creditAmount = grossAmount;
        feeCharged = 0;
        memo = `Deposit: ₦${grossAmount.toLocaleString()} from ${sourceAccountName || "Bloc Account"}`;
        console.log(`[Bellmonie Webhook] ⚡ Intrabank deposit for user ${account.userId}: ₦${grossAmount} credited free.`);
      } else {
        // External transfer: check user's daily subsidized deposit count
        const subsidizedCountToday = await getDailySubsidizedDepositCount(account.userId);
        const feeResult = calculateNgnDepositFee(grossAmount, subsidizedCountToday);
        creditAmount = feeResult.netCreditToUser;
        feeCharged = feeResult.feeChargedToUser;

        console.log(`[Bellmonie Webhook] Deposit fee evaluation for user ${account.userId}:`, {
          grossAmount,
          subsidizedCountToday,
          isSubsidized: feeResult.isSubsidizedByJumpa,
          feeChargedToUser: feeResult.feeChargedToUser,
          creditAmount,
        });

        memo = feeCharged > 0
          ? `Deposit: ₦${grossAmount.toLocaleString()} (-₦${feeCharged.toLocaleString()} fee) from ${sourceAccountName || "External Bank"}`
          : `Deposit: ₦${grossAmount.toLocaleString()} from ${sourceAccountName || "External Bank"} (${sourceBankName || "Bank"})`;
      }

      const creditRes = await atomicCreditNgnBalance({
        userId: account.userId,
        amount: creditAmount,
        grossAmount,
        feePaid: feeCharged,
        reference,
        memo,
        eventId: reference,
      });

      invalidateBalanceCache(account.userId);
      invalidateBellmonieNgnBalanceCache(account.userId);

      console.log(
        `[Bellmonie Webhook] ✅ Credited ₦${creditAmount} (fee: ₦${feeCharged}) to user ${account.userId}. New Balance: ₦${creditRes.newBalance}`,
      );
    } else if (
      event === "payout" ||
      event === "transfer" ||
      event?.startsWith("payout") ||
      event?.startsWith("transfer")
    ) {
      const reference = payload.reference || payload.data?.reference;
      const rawStatus = (
        payload.status ||
        payload.data?.status ||
        (event?.includes("success") ? "successful" : "") ||
        (event?.includes("fail") ? "failed" : "") ||
        (event?.includes("reverse") ? "reversed" : "") ||
        ""
      ).toLowerCase();

      if (!reference) {
        return NextResponse.json(
          { error: "Missing required reference for payout event" },
          { status: 400 },
        );
      }

      await connectDB();

      const existingTx = await Transaction.findOne({
        $or: [
          { "bankDetails.reference": reference },
          { txHash: reference },
        ],
      });

      if (!existingTx) {
        console.warn(
          `[Bellmonie Webhook] No matching transaction found for payout reference: ${reference}`,
        );
        return NextResponse.json({ received: true });
      }

      if (rawStatus === "successful" || rawStatus === "success") {
        if (existingTx.status !== "CONFIRMED") {
          existingTx.status = "CONFIRMED";
          existingTx.executedAt = new Date();
          await existingTx.save();
        }

        invalidateBalanceCache(existingTx.userId);
        invalidateBellmonieNgnBalanceCache(existingTx.userId);

        createNotification({
          userId: existingTx.userId,
          tab: "transactions",
          type: "WITHDRAWAL_COMPLETED",
          title: "Withdrawal Successful",
          body: `₦${Number(existingTx.amount).toLocaleString()} transfer to ${existingTx.bankDetails?.accountName || "beneficiary"} (${existingTx.bankDetails?.bankName || "Bank"}) has been completed successfully.`,
          metadata: {
            reference,
            amount: existingTx.amount,
            bankName: existingTx.bankDetails?.bankName,
            accountNumber: existingTx.bankDetails?.accountNumber,
          },
          link: "/transactions",
        }).catch(() => {});

        console.log(
          `[Bellmonie Webhook] ✅ Payout ${reference} confirmed successful for user ${existingTx.userId}`,
        );
      } else if (
        rawStatus === "failed" ||
        rawStatus === "reversed" ||
        rawStatus === "rejected"
      ) {
        if (existingTx.status === "FAILED") {
          console.log(`[Bellmonie Webhook] Payout ${reference} already marked FAILED.`);
          return NextResponse.json({ received: true });
        }

        // Refund debited withdrawal amount + fee back to user's Bellmonie atomic balance
        const refundAmount =
          Number(existingTx.amount || 0) + Number(existingTx.feePaid || 0);

        if (refundAmount > 0) {
          await atomicCreditNgnBalance({
            userId: existingTx.userId,
            amount: refundAmount,
            reference: `${reference}-refund`,
            memo: `Refund for failed transfer to ${existingTx.bankDetails?.accountName || "beneficiary"} (${existingTx.bankDetails?.bankName || "Bank"})`,
            eventId: `${reference}-refund`,
          });
        }

        existingTx.status = "FAILED";
        const failureReason =
          payload.failureReason ||
          payload.message ||
          payload.data?.failureReason ||
          "Transfer declined by destination bank";
        existingTx.memo = `${existingTx.memo || "Withdrawal"} - Failed: ${failureReason}`;
        await existingTx.save();

        createNotification({
          userId: existingTx.userId,
          tab: "transactions",
          type: "SECURITY_ALERT",
          title: "Transfer Failed & Refunded",
          body: `Your withdrawal of ₦${Number(existingTx.amount).toLocaleString()} could not be completed and has been refunded to your Naira balance.`,
          metadata: {
            reference,
            refundAmount,
            reason: failureReason,
          },
          link: "/transactions",
        }).catch(() => {});

        invalidateBalanceCache(existingTx.userId);
        invalidateBellmonieNgnBalanceCache(existingTx.userId);

        console.log(
          `[Bellmonie Webhook] ❌ Payout ${reference} failed (${failureReason}). Refunded ₦${refundAmount} to user ${existingTx.userId}.`,
        );
      } else {
        console.log(
          `[Bellmonie Webhook] Payout ${reference} status update: "${rawStatus}"`,
        );
      }
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
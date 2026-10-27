import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  atomicCreditNgnBalance,
  verifyAellaWebhookSignature,
} from "@/lib/functions/aellaFunctions";
import { calculateNgnDepositFee } from "@/lib/ngn-account";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { dispatchTransactionEmail } from "@/lib/functions/transactionEmailFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/aella
 * Real-time event receiver for Aella MFB virtual account deposits and payouts.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-aella-signature") ||
      req.headers.get("x-signature") ||
      "";

    // In production or when signature is present, verify HMAC-SHA512
    if (process.env.NODE_ENV === "production" || signature) {
      const isValid = verifyAellaWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn("[Aella Webhook] ❌ Invalid webhook signature rejected");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[Aella Webhook] Failed to parse JSON body:", rawBody);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const event = String(payload.event || payload.type || payload.action || "").toLowerCase();
    const data = payload.data || payload;

    console.log(`[Aella Webhook] Incoming event: "${event}"`, {
      reference:
        data.reference ||
        data.id ||
        data.sessionId ||
        data.externalReference ||
        data.transactionReference,
      accountNumber:
        data.receiverAccountNumber ||
        data.accountNumber ||
        data.account_number,
      amount: data.amount,
    });

    await connectDB();

    // ── 1. INWARD DEPOSIT EVENT ──
    if (
      event.includes("inward") ||
      event.includes("deposit") ||
      event === "inwards.completed" ||
      event === "collection.successful" ||
      event === "wallet.funded"
    ) {
      const accountNumber = String(
        data.receiverAccountNumber ||
        data.accountNumber ||
        data.account_number ||
        ""
      ).trim();
      const amountReceived = Number(data.amount || data.settledAmount || 0);
      const reference = String(
        data.id ||
        data.sessionId ||
        data.reference ||
        data.transactionReference ||
        data.transaction_reference ||
        `inward-${Date.now()}`
      );
      const senderName = data.senderName || data.sender_name || data.originatorAccountName || "Bank Transfer";
      const senderBank = data.senderBank || data.sender_bank || data.originatorBankName || "Commercial Bank";
      const senderAccountNumber = data.senderAccountNumber || data.sender_account_number || "";

      if (!accountNumber || amountReceived <= 0) {
        console.warn("[Aella Webhook] Inward deposit missing account number or valid amount:", data);
        return NextResponse.json({ success: true, message: "Ignored invalid inward payload" });
      }

      // Check idempotency on transaction reference
      const existingTx = await Transaction.findOne({ txHash: reference });
      if (existingTx) {
        console.log(`[Aella Webhook] Inward deposit ${reference} already processed.`);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      // Locate user NgnAccount by account number
      const account = await NgnAccount.findOne({
        accountNumber,
        status: "active",
      });

      if (!account) {
        console.warn(`[Aella Webhook] No matching user NgnAccount found for ${accountNumber}`);
        return NextResponse.json({ success: true, message: "Account not found on platform" });
      }

      // Deposits are 100% free on Jumpa with no fee charged to users
      const feeEvaluation = calculateNgnDepositFee(amountReceived);
      const feeCharged = feeEvaluation.feeChargedToUser;
      const creditAmount = feeEvaluation.netCreditToUser;

      const memo = feeCharged > 0
        ? `Deposit: ₦${amountReceived.toLocaleString()} (-₦${feeCharged.toLocaleString()} fee) from ${senderName || "Bank Transfer"}`
        : `Deposit: ₦${amountReceived.toLocaleString()} from ${senderName || "Bank Transfer"} (${senderBank || "Bank"})`;

      const creditRes = await atomicCreditNgnBalance({
        userId: account.userId,
        amount: creditAmount,
        grossAmount: amountReceived,
        feePaid: feeCharged,
        reference,
        memo,
        eventId: reference,
        senderName,
        senderAccountNumber,
        senderBank,
      });

      invalidateBalanceCache(account.userId);

      // Dispatch deposit confirmation email
      try {
        const creditedTx = await Transaction.findOne({ txHash: reference });
        if (creditedTx) {
          dispatchTransactionEmail(creditedTx._id, "DEPOSIT_CONFIRMED").catch(() => {});
        }
      } catch (err) {
        console.warn("[Aella Webhook] Failed to dispatch deposit email:", err);
      }

      console.log(`[Aella Webhook] ✅ Successfully credited ₦${creditAmount} to user ${account.userId}. New Balance: ₦${creditRes.newBalance}`);
      return NextResponse.json({ success: true, message: "Deposit processed successfully" });
    }

    // ── 2. OUTWARD TRANSFER UPDATE ──
    if (
      event.includes("outward") ||
      event.includes("transfer") ||
      event === "outwards.completed" ||
      event === "outwards.failed" ||
      event === "transfer.completed" ||
      event === "transfer.failed"
    ) {
      const reference = String(
        data.externalReference ||
        data.reference ||
        data.id ||
        data.sessionId ||
        data.transactionReference ||
        data.transaction_reference ||
        ""
      );

      if (reference) {
        const tx = await Transaction.findOne({
          $or: [
            { txHash: reference },
            { "bankDetails.reference": reference },
          ],
        });
        if (tx) {
          const isSuccess = event.includes("completed") || event.includes("success");
          const wasAlreadyConfirmed = tx.status === "CONFIRMED";
          const failureReason =
            data.failureReason ||
            data.message ||
            data.errorMessage ||
            "Transfer declined by destination bank";

          await Transaction.findByIdAndUpdate(tx._id, {
            $set: {
              status: isSuccess ? "CONFIRMED" : "FAILED",
              "metadata.aellaWebhookEvent": event,
              executedAt: isSuccess ? new Date() : tx.executedAt,
              errorMessage: isSuccess ? undefined : failureReason,
            },
          });
          invalidateBalanceCache(tx.userId);

          if (isSuccess && !wasAlreadyConfirmed) {
            createNotification({
              userId: tx.userId,
              tab: "transactions",
              type: "WITHDRAWAL_COMPLETED",
              title: "Withdrawal Successful",
              body: `₦${Number(tx.amount).toLocaleString()} transfer to ${tx.bankDetails?.accountName || tx.toAddress || "beneficiary"} (${tx.bankDetails?.bankName || "Bank"}) has been completed successfully.`,
              metadata: {
                reference,
                amount: tx.amount,
                bankName: tx.bankDetails?.bankName,
                accountNumber: tx.bankDetails?.accountNumber,
                txId: tx._id?.toString(),
              },
              link: "/transactions",
            }).catch(() => {});
            dispatchTransactionEmail(tx._id, "WITHDRAWAL_CONFIRMED").catch(() => {});
          } else if (!isSuccess && tx.status !== "FAILED") {
            createNotification({
              userId: tx.userId,
              tab: "transactions",
              type: "SECURITY_ALERT",
              title: "Withdrawal Failed",
              body: `₦${Number(tx.amount).toLocaleString()} transfer to ${tx.bankDetails?.accountName || tx.toAddress || "beneficiary"} (${tx.bankDetails?.bankName || "Bank"}) failed: ${failureReason}.`,
              metadata: {
                reference,
                amount: tx.amount,
                bankName: tx.bankDetails?.bankName,
                accountNumber: tx.bankDetails?.accountNumber,
                txId: tx._id?.toString(),
              },
              link: "/transactions",
            }).catch(() => {});
            dispatchTransactionEmail(tx._id, "WITHDRAWAL_FAILED").catch(() => {});
          }

          console.log(`[Aella Webhook] Outward transfer ${reference} marked ${isSuccess ? "CONFIRMED" : "FAILED"}`);
        }
      }
      return NextResponse.json({ success: true, message: "Outward status updated" });
    }

    return NextResponse.json({ success: true, message: `Event ${event} acknowledged` });
  } catch (error: any) {
    console.error("[Aella Webhook Error]:", error);
    return NextResponse.json({ error: error.message || "Webhook processing error" }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/aella
 * Simple health probe for webhook URL validation.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Aella Webhook Receiver",
    timestamp: new Date().toISOString(),
  });
}

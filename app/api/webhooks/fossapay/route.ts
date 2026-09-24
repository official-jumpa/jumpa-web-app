import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  atomicCreditNgnBalance,
  refreshUserNgnAccountBalance,
} from "@/lib/functions/fossapayFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-fossapay-signature");
    const webhookSecret = process.env.FOSSAPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing signature or secret" },
        { status: 401 }
      );
    }

    const payloadText = await req.text();
    const payload = JSON.parse(payloadText);
    const event = payload.event || payload.eventType;
    const { data } = payload;
    
    // Verify signature
    let expectedSignature;
    try {
      expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(data))
        .digest("hex");
    } catch (err) {
      console.error("FossaPay: Signature hash generation failed:", err);
      return NextResponse.json({ error: "Invalid payload or secret" }, { status: 400 });
    }

    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.error(`FossaPay: Signature mismatch. Received: ${signature}, Expected: ${expectedSignature}`);
      return NextResponse.json({ error: "Invalid signature"}, { status: 401 });
    }

    console.log(`FossaPay: Event type: ${event}`);

    if (event === "deposit.completed") {
      const { customerId, amount, reference } = data;
      console.log(`FossaPay: Processing deposit: ₦${amount} for customer ${customerId} (ref: ${reference})`);

      await connectDB();

      const account = await NgnAccount.findOne({
        providerCustomerId: customerId,
        provider: "fossapay",
      });

      if (!account) {
        console.error(`FossaPay: No account found for customerId: ${customerId}`);
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const userId = account.userId;
      console.log(`FossaPay: Matched customerId to userId: ${userId}`);

      // Check if transaction already exists to prevent duplicate processing
      const existingTx = await Transaction.findOne({ txHash: reference });
      if (existingTx) {
        console.log(`FossaPay: Transaction ${reference} already processed`);
        return NextResponse.json({ received: true });
      }

      // Credit local ledger & record confirmed transaction atomically
      const creditResult = await atomicCreditNgnBalance({
        userId,
        amount: Number(amount),
        reference,
        memo: `Bank Transfer Deposit (${reference})`,
      });

      console.log(`FossaPay: Deposit of ₦${amount} credited. New balance: ₦${creditResult.newBalance} for user ${userId}`);

      // Invalidate balance cache across server and trigger live wallet sync
      invalidateBalanceCache(userId);
      refreshUserNgnAccountBalance(userId).catch((err) => {
        console.warn("[FossaPay Webhook] Background live sync notice:", err);
      });
    } else {
      console.log(`FossaPay: Unhandled event type: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("FossaPay: Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

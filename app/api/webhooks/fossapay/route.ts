import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import { atomicCreditNgnBalance } from "@/lib/functions/fossapayFunctions";
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
    console.log(`FossaPay Webhook Payload: ${payloadText}`);

    // Verify signature
    let expectedSignature;
    let fallbackSignature;
    try {
      expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payloadText)
        .digest("hex");

      fallbackSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(JSON.parse(payloadText)))
        .digest("hex");
    } catch (err) {
      console.error("FossaPay: Signature hash generation failed:", err);
      return NextResponse.json({ error: "Invalid payload or secret" }, { status: 400 });
    }

    if (
      (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) &&
      (signature.length !== fallbackSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(fallbackSignature)))
    ) {
      console.error(`FossaPay: Signature mismatch. Received: ${signature}, Expected: ${expectedSignature}, Fallback: ${fallbackSignature}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(payloadText);
    const event = payload.event || payload.eventType;
    const { data } = payload;

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

      // Record transaction
      const transaction = await Transaction.create({
        userId,
        type: "DEPOSIT",
        status: "CONFIRMED",
        chain: "fiat",
        network: "mainnet",
        toAddress: account.accountNumber,
        amount: amount.toString(),
        feePaid: "0",
        token: "NGN",
        txHash: reference,
        memo: `Bank Transfer Deposit`,
        executedAt: new Date(),
      });

      console.log(`FossaPay: Transaction ${reference} recorded successfully`);

      // Credit local ledger
      await atomicCreditNgnBalance({
        userId,
        amount: Number(amount),
        reference,
        memo: `Bank Transfer Deposit (${reference})`,
      });

      // Invalidate cache
      invalidateBalanceCache(userId);

      // Log activity and notify
      await logUserActivity({
        userId,
        action: "DEPOSIT_COMPLETED",
        details: {
          amount,
          reference,
          provider: "fossapay"
        },
      });

      await createNotification({
        userId,
        tab: "transactions",
        type: "DEPOSIT_COMPLETED",
        title: "Deposit Received",
        body: `You received a deposit of ₦${Number(amount).toLocaleString()} into your Naira account`,
        metadata: {
          amount,
          txHash: reference,
        },
        link: "/ngn-account",
      });

      console.log(`FossaPay: Deposit of ₦${amount} processed for user ${userId}`);
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

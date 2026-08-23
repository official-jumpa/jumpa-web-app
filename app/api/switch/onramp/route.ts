import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { fiatAmount, cryptoToken, asset, walletAddress, isExactOut = false } = body;

    console.log(`[Switch Onramp API] [User: ${userId}] → Request:`, {
      fiatAmount,
      cryptoToken,
      asset,
      walletAddress,
      isExactOut,
    });

    if (!fiatAmount || !asset || !walletAddress) {
      console.warn(`[Switch Onramp API] [User: ${userId}] ✗ Missing required fields`);
      return NextResponse.json(
        { success: false, error: "Required details are missing" },
        { status: 400 }
      );
    }

    const amount = Number(fiatAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid fiatAmount" }, { status: 400 });
    }

    const result = await SwitchService.initiateOnRamp(amount, asset, walletAddress, isExactOut);

    console.log(`[Switch Onramp API] [User: ${userId}] ← Raw Switch response:`, result);

    if (!result.success || !result.data) {
      console.error(`[Switch Onramp API] [User: ${userId}] ✗ Switch API error:`, result.message);
      return NextResponse.json(
        { success: false, error: result.message || "Onramp initiation failed" },
        { status: result.status || 500 }
      );
    }

    const { deposit, reference, destination } = result.data;

    // Record in Transaction ledger tied to authenticated user
    try {
      await connectDB();
      await Transaction.create({
        userId,
        type: "ONRAMP",
        status: "PENDING",
        chain: asset.split(":")[0] || "base",
        network: "mainnet",
        fromAddress: "SWITCH_NGN_BANK",
        toAddress: walletAddress,
        amount: String(destination.amount),
        token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
        txHash: reference,
        feePaid: "0",
        rampDetails: {
          provider: "switch",
          fiatCurrency: "NGN",
          fiatAmount: amount,
          reference,
        },
        executedAt: new Date(),
      });
      console.log(`[Switch Onramp API] [User: ${userId}] Transaction record saved: ${reference}`);
    } catch (dbErr: any) {
      console.warn(`[Switch Onramp API] [User: ${userId}] DB record notice:`, dbErr.message);
    }

    return NextResponse.json({
      success: true,
      reference,
      bankName: deposit.bank_name,
      bankCode: deposit.bank_code,
      accountName: deposit.account_name,
      accountNumber: deposit.account_number,
      notes: deposit.note,
      cryptoAmount: destination.amount,
      cryptoCurrency: destination.currency,
      fiatAmount: amount,
      fiatCurrency: "NGN",
    });
  } catch (err: any) {
    console.error("[Switch Onramp API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

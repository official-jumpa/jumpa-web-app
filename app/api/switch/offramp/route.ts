import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { resolveBankCode } from "@/lib/switch-banks";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
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

    const { cryptoAmount, cryptoToken, asset, holderName, accountNumber, bankName, isExactOut = false } = body;

    console.log(`[Switch Offramp API] [User: ${userId}] → Request:`, {
      cryptoAmount,
      cryptoToken,
      asset,
      holderName,
      accountNumber,
      bankName,
      isExactOut,
    });

    if (!cryptoAmount || !asset || !holderName || !accountNumber || !bankName) {
      console.warn(`[Switch Offramp API] [User: ${userId}] ✗ Missing required fields`);
      return NextResponse.json(
        { success: false, error: "Incomplete payload" },
        { status: 400 }
      );
    }

    // Resolve bank code and verify account via Paystack
    const paystackBank = findPaystackBank(bankName);
    if (!paystackBank) {
      console.error(`[Switch Offramp API] [User: ${userId}] ✗ Could not resolve bank code for: "${bankName}"`);
      return NextResponse.json(
        {
          success: false,
          error: `Bank "${bankName}" not found. Please check the bank name and try again.`,
        },
        { status: 400 }
      );
    }

    const cleanAccount = String(accountNumber || "").trim().replace(/\D/g, "");
    const resolveRes = await validateAccountNumber(cleanAccount, paystackBank.code);
    if (!resolveRes || !resolveRes.status || !resolveRes.data?.account_name) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not verify account number ${cleanAccount} with ${paystackBank.name}. Please ensure the details are correct.`,
        },
        { status: 400 }
      );
    }

    const verifiedHolderName = resolveRes.data.account_name.trim();
    const bankMatch = resolveBankCode(bankName) || resolveBankCode(paystackBank.name);
    if (!bankMatch) {
      return NextResponse.json(
        {
          success: false,
          error: `Bank "${paystackBank.name}" is not supported by Switch for offramp.`,
        },
        { status: 400 }
      );
    }

    console.log(`[Switch Offramp API] [User: ${userId}] Bank lookup: "${bankName}" → "${bankMatch.name}" (${bankMatch.code})`);

    const amount = Number(cryptoAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid cryptoAmount" }, { status: 400 });
    }

    const result = await SwitchService.initiateOfframp(
      amount,
      asset,
      {
        holder_name: verifiedHolderName,
        account_number: cleanAccount,
        bank_code: bankMatch.code,
      },
      isExactOut
    );

    console.log(`[Switch Offramp API] [User: ${userId}] ← Switch response:`, result);

    if (!result.success || !result.data) {
      console.error(`[Switch Offramp API] [User: ${userId}] ✗ Switch API error:`, result.message);
      return NextResponse.json(
        { success: false, error: result.message || "Offramp initiation failed" },
        { status: result.status || 500 }
      );
    }

    const { deposit, reference, destination, rate } = result.data;

    // Record in Transaction ledger tied to authenticated user
    try {
      await connectDB();
      await Transaction.create({
        userId,
        type: "OFFRAMP",
        status: "PENDING",
        chain: asset.split(":")[0] || "base",
        network: "mainnet",
        fromAddress: "USER_WALLET",
        toAddress: `${bankMatch.name} / ${accountNumber}`,
        amount: String(deposit.amount),
        token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
        txHash: reference,
        feePaid: "0",
        rampDetails: {
          provider: "switch",
          fiatCurrency: "NGN",
          fiatAmount: destination.amount,
          reference,
        },
        executedAt: new Date(),
      });
      console.log(`[Switch Offramp API] [User: ${userId}] Transaction record saved: ${reference}`);
    } catch (dbErr: any) {
      console.warn(`[Switch Offramp API] [User: ${userId}] DB record notice:`, dbErr.message);
    }

    return NextResponse.json({
      success: true,
      reference,
      depositAddress: deposit.address,
      depositAsset: deposit.asset,
      depositAmount: deposit.amount,
      depositNotes: deposit.note,
      rate,
      fiatAmount: destination.amount,
      fiatCurrency: destination.currency,
      resolvedBank: bankMatch.name,
      resolvedBankCode: bankMatch.code,
    });
  } catch (err: any) {
    console.error("[Switch Offramp API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

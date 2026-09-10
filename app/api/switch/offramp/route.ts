import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { resolveBankCode } from "@/lib/switch-banks";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { switchOfframpSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const validation = switchOfframpSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const {
      cryptoAmount,
      cryptoToken,
      asset,
      holderName,
      accountNumber,
      bankName,
    } = validation.data;

    // Resolve bank code and verify account via Paystack
    const paystackBank = findPaystackBank(bankName);
    if (!paystackBank) {
      return NextResponse.json(
        {
          success: false,
          error: `Bank "${bankName}" is not supported`,
        },
        { status: 400 },
      );
    }

    const isAccountValid = await validateAccountNumber(accountNumber, paystackBank.code);
    if (!isAccountValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Account number "${accountNumber}" could not be verified for ${paystackBank.name}.`,
        },
        { status: 400 },
      );
    }

    const switchBank = resolveBankCode(paystackBank.name);
    const bankMatch = {
      name: switchBank?.name || paystackBank.name,
      code: switchBank?.code || paystackBank.code,
    };

    const recipient = {
      holder_name: holderName.trim(),
      account_number: accountNumber.trim(),
      bank_code: bankMatch.code,
    };


    const result = await SwitchService.initiateOfframp(
      cryptoAmount,
      asset,
      recipient,
    );


    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.message || "Offramp initiation failed" },
        { status: result.status || 500 },
      );
    }

    const { deposit, reference, destination, rate } = result.data;

    // Record in Transaction ledger tied to authenticated user via transactionFunctions
    try {
      await createTransactionRecord({
        userId,
        type: "OFFRAMP",
        status: "PENDING",
        chain: (asset.split(":")[0] || "base") as any,
        network: "mainnet",
        fromAddress: "USER_WALLET",
        toAddress: `${bankMatch.name} / ${accountNumber}`,
        amount: String(deposit.amount),
        token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
        txHash: reference,
        rampDetails: {
          provider: "switch",
          fiatCurrency: "NGN",
          fiatAmount: destination.amount,
          reference,
        },
        executedAt: new Date(),
      });
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

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { switchOnrampSchema } from "@/lib/validations/switch.validation";
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
    const validation = switchOnrampSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const { fiatAmount, cryptoToken, asset, walletAddress, isExactOut = false } =
      validation.data;

    const result = await SwitchService.initiateOnRamp(
      fiatAmount,
      asset,
      walletAddress,
      isExactOut,
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.message || "Onramp initiation failed" },
        { status: result.status || 500 },
      );
    }

    const { deposit, reference, destination } = result.data;

    // Record in Transaction ledger tied to authenticated user via transactionFunctions
    try {
      await createTransactionRecord({
        userId,
        type: "ONRAMP",
        status: "PENDING",
        chain: (asset.split(":")[0] || "base") as any,
        network: "mainnet",
        fromAddress: "SWITCH_NGN_BANK",
        toAddress: walletAddress,
        amount: String(destination.amount),
        token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
        txHash: reference,
        rampDetails: {
          provider: "switch",
          fiatCurrency: "NGN",
          fiatAmount,
          reference,
        },
        executedAt: new Date(),
      });
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
      fiatAmount,
      fiatCurrency: "NGN",
    });
  } catch (err: any) {
    console.error("[Switch Onramp API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

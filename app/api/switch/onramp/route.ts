import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { SwitchService } from "@/lib/switch";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { switchOnrampSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;
    const userId = authResult.userId;

    const body = await req.json().catch(() => ({}));
    const validation = switchOnrampSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const { fiatAmount, cryptoToken, asset, walletAddress } =
      validation.data;

    const result = await SwitchService.initiateOnRamp(
      fiatAmount,
      asset,
      walletAddress,
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

      const tokenName = cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC";

      logUserActivity({
        userId,
        action: "ONRAMP_INITIATED",
        details: {
          reference,
          fiatAmount,
          fiatCurrency: "NGN",
          cryptoAmount: destination.amount,
          cryptoToken: tokenName,
        },
        req,
      }).catch((e) => console.error("[Switch Onramp] ActivityLog error:", e));

      createNotification({
        userId,
        tab: "transactions",
        type: "ONRAMP_INITIATED",
        title: "Deposit Initiated",
        body: `Initiated deposit of ₦${fiatAmount.toLocaleString()} for ${destination.amount} ${tokenName}`,
        metadata: {
          reference,
          fiatAmount,
          cryptoAmount: destination.amount,
          token: tokenName,
        },
        link: "/transactions",
      }).catch((e) => console.error("[Switch Onramp] Notification error:", e));
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

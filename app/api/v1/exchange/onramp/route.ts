import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { SwitchService } from "@/lib/switch";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { switchOnrampSchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/exchange/onramp
 * Initiates an onramp deposit order, generating a virtual bank account for the user to fund.
 * Body: { fiatAmount: number, cryptoToken: string, asset: string, walletAddress: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "switch_onramp" },
    });
    if (!authResult.ok) return authResult.response;
    const userId = authResult.userId;

    const body = await req.json().catch(() => ({}));
    const validation = switchOnrampSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 400 },
      );
    }

    const { fiatAmount, cryptoToken, asset, walletAddress } = validation.data;

    const result = await SwitchService.initiateOnRamp(
      fiatAmount,
      asset,
      walletAddress,
    );

    if (!result.success || !result.data) {
      console.error(
        `Onramp Error: ${formatOneLineError(result.message)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: result.message || "Failed to initiate deposit",
        },
        { status: result.status || 400 },
      );
    }

    const { deposit, reference, destination } = result.data;
    const tokenName =
      cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC";

    // Record in Transaction ledger tied to authenticated user
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
        token: tokenName,
        txHash: reference,
        rampDetails: {
          provider: "switch",
          fiatCurrency: "NGN",
          fiatAmount,
          reference,
        },
        executedAt: new Date(),
      });

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
      }).catch((e) =>
        console.warn(
          `Error: ${formatOneLineError(e)}`,
        ),
      );

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
      }).catch((e) =>
        console.warn(
          `Error: ${formatOneLineError(e)}`,
        ),
      );
    } catch (dbErr: any) {
      console.warn(
        `Error: ${formatOneLineError(dbErr)}`,
      );
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
    const isTimeout = isTimeoutError(err);
    console.error(
      `Error: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "The deposit service request timed out. Please try again."
          : "Unable to initiate deposit at this time. Please try again later.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}

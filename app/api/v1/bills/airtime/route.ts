import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { verifyWalletPinAndLockout } from "@/lib/functions/walletFunctions";
import { purchaseAirtime } from "@/lib/functions/billsFunctions";
import { buyAirtimeSchema } from "@/lib/validations/bills.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

/** Vercy replaces 502/504 replies with its own HTML page, so a failed provider answers 424. */
const PROVIDER_FAILED = 424;

/**
 * POST /api/v1/bills/airtime
 * Recharges airtime on a mobile phone.
 * Body: { phone: string, amount: number, network?: string, pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      requireWallet: true,
      rateLimit: { tier: "high", action: "buy_airtime" },
    });
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));

    const validation = buyAirtimeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { phone, amount, network, pin } = validation.data;
    const cookieAddress = req.cookies.get("selected_wallet_address")?.value;
    const targetAddress = cookieAddress || auth.address;

    // Verify 4-digit security PIN with lockout & rate limiting
    const pinCheck = await verifyWalletPinAndLockout(
      auth.userId,
      pin,
      targetAddress,
    );

    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: pinCheck.error || "Incorrect PIN" },
        { status: pinCheck.statusCode || 400 },
      );
    }

    // Execute airtime recharge
    const result = await purchaseAirtime({
      phone,
      amount,
      network,
      userId: auth.userId,
      walletAddress: targetAddress,
    });

    // Minimal client-safe return: only success and reference for receipt
    return NextResponse.json({
      success: true,
      reference: result.reference,
    });
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    const isTimeout = isTimeoutError(err);

    console.error(
      `[Airtime] Error: ${formatOneLineError(err)}`,
    );

    const isClientError =
      msg.includes("limit") ||
      msg.includes("naira account") ||
      msg.includes("balance") ||
      msg.includes("insufficient") ||
      msg.includes("funds") ||
      msg.includes("pin");

    if (isClientError) {
      return NextResponse.json(
        { error: err.message || "Failed to process airtime recharge" },
        { status: 400 },
      );
    }

    if (isTimeout) {
      return NextResponse.json(
        {
          error:
            "Your airtime recharge is still processing. Check your transaction history before trying again.",
        },
        { status: PROVIDER_FAILED },
      );
    }

    return NextResponse.json(
      {
        error:
          "We couldn't complete this airtime recharge. Check your transaction history before trying again.",
      },
      { status: PROVIDER_FAILED },
    );
  }
}

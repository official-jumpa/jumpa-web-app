import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { verifyWalletPinAndLockout } from "@/lib/functions/walletFunctions";
import { purchaseAirtime } from "@/lib/functions/billsFunctions";
import { buyAirtimeSchema } from "@/lib/validations/bills.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/bills/airtime
 * Recharges airtime on a mobile phone.
 * Body: { phone: string, amount: number, network?: string, pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({ requireWallet: true });
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    console.log(`Incoming request for user: ${auth.userId}, phone: ${body.phone}, amount: ₦${body.amount}, network: ${body.network}`);

    const validation = buyAirtimeSchema.safeParse(body);
    if (!validation.success) {
      console.warn(
        `Validation failed for user ${auth.userId}:`,
        validation.error.format(),
        "Payload:",
        { ...body, pin: body.pin ? "****" : undefined },
      );
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { phone, amount, network, pin } = validation.data;
    const cookieAddress = req.cookies.get("selected_wallet_address")?.value;
    const targetAddress = cookieAddress || auth.address;

    // Verify 4-digit security PIN with lockout & rate limiting
    console.log(`Verifying PIN for user: ${auth.userId}, wallet: ${targetAddress}`);
    const pinCheck = await verifyWalletPinAndLockout(
      auth.userId,
      pin,
      targetAddress,
    );

    if (!pinCheck.valid) {
      console.warn(
        `PIN verification rejected for user ${auth.userId}:`,
        pinCheck.error,
      );
      return NextResponse.json(
        { error: pinCheck.error || "Incorrect PIN" },
        { status: pinCheck.statusCode || 400 },
      );
    }

    // Execute airtime recharge
    console.log(`Initiating purchase: phone=${phone}, amount=₦${amount}, network=${network}`);
    const result = await purchaseAirtime({
      phone,
      amount,
      network,
      userId: auth.userId,
      walletAddress: targetAddress,
    });

    console.log(
      `Airtime purchase SUCCESSFUL for user ${auth.userId}: orderId=${result.orderId}, ref=${result.reference}`,
    );

    return NextResponse.json({
      success: true,
      type: "AIRTIME",
      message: "Airtime recharge successful",
      orderId: result.orderId,
      reference: result.reference,
      providerData: result.providerData,
    });
  } catch (err: any) {
    const msg = (err.message || "").toLowerCase();
    const isClientError =
      msg.includes("naira account") ||
      msg.includes("balance") ||
      msg.includes("insufficient") ||
      msg.includes("funds") ||
      msg.includes("pin");
    return NextResponse.json(
      { error: err.message || "Failed to process airtime recharge" },
      { status: isClientError ? 400 : 500 },
    );
  }
}


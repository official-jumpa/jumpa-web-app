import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { verifyWalletPinAndLockout } from "@/lib/functions/walletFunctions";
import { purchaseData } from "@/lib/functions/billsFunctions";
import { buyDataSchema } from "@/lib/validations/bills.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/bills/data
 * Vends an internet data bundle to a mobile phone.
 * Body: { phone: string, productName: string, amount: number, packageSize?: string, validity?: string, network?: string, pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({ requireWallet: true });
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    console.log(
      `Incoming request for user: ${auth.userId}, phone: ${body.phone}, product: ${body.productName}, amount: ₦${body.amount}, network: ${body.network}`,
    );

    const validation = buyDataSchema.safeParse(body);
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

    const { phone, productName, amount, packageSize, validity, network, pin } =
      validation.data;
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

    // Execute internet data vending
    console.log(
      `Initiating data purchase: phone=${phone}, product=${productName}, amount=₦${amount}, network=${network}`,
    );
    const result = await purchaseData({
      phone,
      productName,
      amount,
      packageSize,
      validity,
      network,
      userId: auth.userId,
      walletAddress: targetAddress,
    });

    console.log(
      `Data purchase SUCCESSFUL for user ${auth.userId}: orderId=${result.orderId}, ref=${result.reference}`,
    );

    return NextResponse.json({
      success: true,
      message: "Data subscription successful",
      orderId: result.orderId,
      reference: result.reference,
      providerData: result.providerData,
    });
  } catch (err: any) {
    console.error("Purchase error:", err?.message || err, err?.stack);
    return NextResponse.json(
      { error: err.message || "Failed to process data subscription" },
      { status: 500 },
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { verifyWalletPinAndLockout } from "@/lib/functions/walletFunctions";
import {
  getCarrierDataPlans,
  purchaseData,
} from "@/lib/functions/billsFunctions";
import {
  buyDataSchema,
  getDataPlansQuerySchema,
} from "@/lib/validations/bills.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/v1/bills/data?phone=08031234567
 * Returns real-time network data bundles for the specified phone number.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "bills_data_plans" },
    });
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get("phone") || "";

    const validation = getDataPlansQuerySchema.safeParse({ phone: rawPhone });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const normalizedPhone = validation.data.phone;

    const { plans: livePlans, detectedNetwork } =
      await getCarrierDataPlans(normalizedPhone);

    if (!livePlans || livePlans.length === 0) {
      return NextResponse.json(
        { error: "No data plans available for this phone number." },
        { status: 404 },
      );
    }

    // Minimal client-safe return: only plans and detected network
    return NextResponse.json(
      {
        success: true,
        plans: livePlans,
        detectedNetwork,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[SmartSMS:GET:data] Upstream failure: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        error: isTimeout
          ? "The request timed out while loading carrier bundles. Please try again."
          : "Unable to retrieve data bundles at this time. Please try again shortly.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}

/**
 * POST /api/v1/bills/data
 * Vends an internet data bundle to a mobile phone.
 * Body: { phone: string, productName: string, amount: number, packageSize?: string, validity?: string, network?: string, pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      requireWallet: true,
      rateLimit: { tier: "high", action: "buy_data" },
    });
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));

    const validation = buyDataSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { phone, productName, amount, packageSize, validity, network, pin } =
      validation.data;
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

    // Execute internet data vending
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

    // Minimal client-safe return: only success and reference for receipt
    return NextResponse.json({
      success: true,
      reference: result.reference,
    });
  } catch (err: any) {
    const msg = (err?.message || "").toLowerCase();
    const isTimeout = isTimeoutError(err);

    console.error(
      `[DATA] Error: ${formatOneLineError(err)}`,
    );

    const isClientError =
      msg.includes("naira account") ||
      msg.includes("balance") ||
      msg.includes("insufficient") ||
      msg.includes("funds") ||
      msg.includes("pin");

    if (isClientError) {
      return NextResponse.json(
        { error: err.message || "Failed to process data subscription" },
        { status: 400 },
      );
    }

    if (isTimeout) {
      return NextResponse.json(
        {
          error:
            "Your order is pending, please check the status shortly before trying again.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to complete data subscription at this time. Please try again shortly.",
      },
      { status: 502 },
    );
  }
}

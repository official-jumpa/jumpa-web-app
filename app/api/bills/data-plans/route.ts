import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getCarrierDataPlans } from "@/lib/functions/billsFunctions";
import { getDataPlansQuerySchema } from "@/lib/validations/bills.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/bills/data-plans?phone=08031234567
 * Returns real-time network data bundles.
 * Throws error directly if provider fails.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get("phone") || "";

    console.log(`Received request for phone: "${rawPhone}"`);

    const validation = getDataPlansQuerySchema.safeParse({ phone: rawPhone });
    if (!validation.success) {
      console.warn(
        `Validation failed for phone "${rawPhone}":`,
        validation.error.format(),
      );
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const normalizedPhone = validation.data.phone;

    const { plans: livePlans, detectedNetwork } =
      await getCarrierDataPlans(normalizedPhone);
    if (!livePlans || livePlans.length === 0) {
      console.warn(`No data plans available for phone: ${normalizedPhone}`);
      return NextResponse.json(
        { error: "No data plans available" },
        { status: 404 },
      );
    }

    console.log(
      `Returning ${livePlans.length} live carrier plans for ${normalizedPhone} (detected: ${detectedNetwork})`,
    );
    return NextResponse.json(
      {
        success: true,
        plans: livePlans,
        detectedNetwork,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (err: any) {
    console.error("Unexpected error:", err?.message || err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve data plans" },
      { status: 502 },
    );
  }
}



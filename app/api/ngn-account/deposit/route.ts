import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { depositNgnSchema } from "@/lib/validations/importapay.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  createDepositSession,
  getOrCreateImportaPayAccount,
} from "@/lib/functions/importapayFunctions";

/**
 * POST /api/ngn-account/deposit
 * Creates a dynamic virtual bank account session for the authenticated user to fund their Naira balance.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parsed = depositNgnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), { status: 422 });
    }

    const { amount } = parsed.data;

    // Ensure the user has an initialized ImportaPay profile
    const fullName = [auth.user.firstName, auth.user.lastName]
      .filter(Boolean)
      .join(" ") || "Customer";

    await getOrCreateImportaPayAccount(auth.userId);

    const session = await createDepositSession({
      userId: auth.userId,
      amount,
      userName: fullName,
    });

    return NextResponse.json(
      {
        success: true,
        session,
        message: "Transfer the exact amount to the provided bank details within 30 minutes",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error initiating deposit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create deposit session" },
      { status: 500 }
    );
  }
}

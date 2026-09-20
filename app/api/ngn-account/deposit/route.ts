import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { depositNgnSchema } from "@/lib/validations/importapay.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  createDepositSession,
  getOrCreateImportaPayAccount,
  getActiveDepositSession,
  cancelActiveDepositSession,
} from "@/lib/functions/importapayFunctions";

/**
 * GET /api/ngn-account/deposit
 * Retrieves the user's currently active unexpired deposit session if one exists.
 */
export async function GET() {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    const session = await getActiveDepositSession(auth.userId);

    return NextResponse.json({
      hasActiveSession: !!session,
      session,
    });
  } catch (error: any) {
    console.error("Error fetching active deposit session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active deposit session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ngn-account/deposit
 * Cancels or clears the user's active deposit session so they can start fresh with a different amount.
 */
export async function DELETE() {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    await cancelActiveDepositSession(auth.userId);

    return NextResponse.json({
      success: true,
      message: "Active deposit session canceled successfully",
    });
  } catch (error: any) {
    console.error("Error canceling deposit session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel deposit session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ngn-account/deposit
 * Creates or retrieves a dynamic virtual bank account session for the authenticated user to fund their Naira balance.
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

    // Derive display name: use first/last name, user.name, or the email username (before @)
    const emailUsername = auth.user.email ? auth.user.email.split("@")[0].trim() : "";
    const nameFromParts = [auth.user.firstName, auth.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const fullName =
      nameFromParts ||
      auth.user.name?.trim() ||
      emailUsername ||
      "Customer";

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

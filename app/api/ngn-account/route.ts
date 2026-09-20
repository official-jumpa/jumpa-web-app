import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getFossapayWallet } from "@/lib/functions/fossapayFunctions";
import { getOrCreateImportaPayAccount } from "@/lib/functions/importapayFunctions";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { connectDB } from "@/lib/db";

/**
 * GET /api/ngn-account
 * Returns the authenticated user's active NGN account and live balance.
 * Defaults to ImportaPay, falling back seamlessly to FossaPay for legacy accounts.
 */
export async function GET() {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    await connectDB();
    console.log("Fetching account for user:", auth.userId);

    // 1. Check for ImportaPay account first (default provider)
    const importaAccount = await NgnAccount.findOne({
      userId: auth.userId,
      provider: "importapay",
    }).lean<INgnAccount>();

    if (importaAccount) {
      return NextResponse.json(
        {
          hasAccount: true,
          account: importaAccount,
          balance: {
            availableBalance: importaAccount.balance ?? 0,
            ledgerBalance: importaAccount.balance ?? 0,
            currency: importaAccount.currency || "NGN",
          },
        },
        { status: 200 }
      );
    }

    // 2. Fall back to FossaPay if user has an existing legacy FossaPay account
    const fossaAccount = await NgnAccount.findOne({
      userId: auth.userId,
      provider: "fossapay",
    }).lean<INgnAccount>();

    if (!fossaAccount) {
      console.log("No NGN account found for user:", auth.userId);
      return NextResponse.json(
        { hasAccount: false, message: "No NGN account found" },
        { status: 404 }
      );
    }

    let liveBalance = null;
    const walletId = fossaAccount.providerAccountId;
    if (walletId) {
      try {
        const walletDetails = await getFossapayWallet(walletId);
        liveBalance = {
          availableBalance: walletDetails?.availableBalance ?? 0,
          ledgerBalance: walletDetails?.ledgerBalance ?? 0,
          currency: walletDetails?.currency ?? (fossaAccount.currency || "NGN"),
        };
      } catch (err: any) {
        console.warn(
          "Could not fetch live balance from FossaPay:",
          err.message
        );
      }
    }

    return NextResponse.json(
      {
        hasAccount: true,
        account: fossaAccount,
        balance: liveBalance,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ngn-account
 * Activates an ImportaPay Naira account profile for the authenticated user.
 */
export async function POST() {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    const account = await getOrCreateImportaPayAccount(auth.userId);

    console.log("ImportaPay account active for user:", auth.userId);

    return NextResponse.json(
      {
        success: true,
        account,
        message: "NGN account activated successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[NGN Account API] Unexpected unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

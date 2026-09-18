import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  createNgnAccountSchema,
  type CreateNgnAccountInput,
} from "@/lib/validations/fossapay.validation";
import {
  createFossapayCustomer,
  createFossapayNgnWallet,
  getNgnAccountByUserId,
  createNgnAccountRecord,
  updateNgnAccountWallet,
  getFossapayWallet,
  mapCountryCodeToName,
} from "@/lib/functions/fossapayFunctions";
import { generateId } from "@/lib/schema-ids";

/**
 * GET /api/ngn-account
 * Returns the authenticated user's NGN account and live wallet balance (if active)
 */
export async function GET() {
  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    console.log("[NGN Account API] Fetching account for user:", auth.userId);
    const account = await getNgnAccountByUserId(auth.userId);

    if (!account) {
      console.log("[NGN Account API] No NGN account found for user:", auth.userId);
      return NextResponse.json(
        { hasAccount: false, message: "No NGN account found" },
        { status: 404 }
      );
    }

    let liveBalance = null;
    const walletId = account.providerAccountId;
    if (walletId) {
      try {
        const walletDetails = await getFossapayWallet(walletId);

        console.log("wallet details", walletDetails);

        liveBalance = {
          availableBalance: walletDetails?.availableBalance ?? 0,
          ledgerBalance: walletDetails?.ledgerBalance ?? 0,
          currency: walletDetails?.currency ?? (account.currency || "NGN"),
        };
      } catch (err: any) {
        console.warn(
          "[NGN Account API] Could not fetch live balance from FossaPay:",
          err.message
        );
      }
    }

    return NextResponse.json(
      {
        hasAccount: true,
        account,
        balance: liveBalance,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[NGN Account API] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching NGN account details" },
      { status: 500 }
    );
  }
}

/**
 * Set to true for now till every doubts is cleared
 */
const NGN_SIGNUPS_PAUSED: boolean = true;

/**
 * POST /api/ngn-account
 * Safely creates a FossaPay customer + NGN virtual bank account
 */
export async function POST(req: Request) {
  if (NGN_SIGNUPS_PAUSED) {
    return NextResponse.json(
      {
        error:
          "NGN account registration is still in beta. Check back soon",
      },
      { status: 503 }
    );
  }

  try {
    const auth = await requireActiveUser({ requireWallet: false });
    if (!auth.ok) return auth.response;

    console.log("[NGN Account API] POST received for user:", auth.userId);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // 1. Validate form fields
    const parsed = createNgnAccountSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      console.warn("[NGN Account API] Validation error:", formatted);
      return NextResponse.json(formatted, { status: 422 });
    }

    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      mobileNumber,
      address,
      city,
    } = parsed.data;

    // 2. Check for existing NgnAccount in DB
    let existingAccount = await getNgnAccountByUserId(auth.userId);

    if (
      existingAccount &&
      existingAccount.status === "active" &&
      existingAccount.accountNumber
    ) {
      console.log(
        "[NGN Account API] User already has active NGN account:",
        existingAccount.accountNumber
      );
      return NextResponse.json(
        {
          success: true,
          account: existingAccount,
          message: "You already have an active NGN account",
        },
        { status: 200 }
      );
    }

    // Country mapped from user profile (fallback to Nigeria)
    const countryName = mapCountryCodeToName(auth.user.country || "NG");
    const userEmail = auth.user.email;

    if (!userEmail) {
      console.error("[NGN Account API] Authenticated user has no email address");
      return NextResponse.json(
        { error: "A verified email address is required on your profile" },
        { status: 400 }
      );
    }

    // 3. Step 1: Create FossaPay Customer (or reuse if previous attempt failed at wallet stage)
    let customerId = existingAccount?.providerCustomerId;

    if (!customerId) {
      console.log("[NGN Account API] Step 1: Creating FossaPay customer...");
      try {
        const customer = await createFossapayCustomer({
          firstName,
          middleName,
          lastName,
          emailAddress: userEmail,
          mobileNumber,
          dateOfBirth,
          address,
          city,
          country: countryName,
        });

        customerId = customer.id;
        console.log("[NGN Account API] FossaPay customer created:", customer);

        // Immediately persist customer ID to DB to prevent orphan customers if wallet fails
        existingAccount = await createNgnAccountRecord({
          userId: auth.userId,
          currency: "NGN",
          provider: "fossapay",
          status: "pending",
          providerCustomerId: customerId,
          firstName,
          middleName,
          lastName,
          emailAddress: userEmail,
          mobileNumber,
          dateOfBirth,
          address,
          city,
          country: countryName,
        });
      } catch (custError: any) {
        console.error(
          "[NGN Account API] Failed during customer creation:",
          custError.message,
          custError.data || ""
        );
        return NextResponse.json(
          {
            error:
              custError.data?.message ||
              custError.message ||
              "Failed to register customer profile with provider",
            details: custError.data || null,
          },
          { status: custError.status || 500 }
        );
      }
    } else {
      console.log(
        "[NGN Account API] Existing FossaPay customer found, reusing ID:",
        customerId
      );
    }

    // 4. Step 2: Create FossaPay NGN Wallet
    console.log("[NGN Account API] Step 2: Provisioning NGN wallet for customer:", customerId);

    const walletReference = generateId("ngn");
    const walletDisplayName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ");

    try {
      const wallet = await createFossapayNgnWallet({
        customerId,
        walletName: walletDisplayName,
        walletReference,
      });
      console.log("wallet fossapy", wallet);

      console.log("[NGN Account API] Wallet created. Updating DB record:", existingAccount?._id);

      const updatedAccount = await updateNgnAccountWallet(
        existingAccount!._id,
        {
          providerAccountId: wallet.walletId,
          bankName: wallet.bankName,
          bankCode: wallet.bankCode,
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName,
          providerReference: walletReference,
        }
      );

      console.log("[NGN Account API] Account successfully activated:", {
        accountNumber: wallet.accountNumber,
        bankName: wallet.bankName,
      });

      return NextResponse.json(
        {
          success: true,
          account: updatedAccount,
        },
        { status: 201 }
      );
    } catch (walletError: any) {
      console.error(
        "[NGN Account API] Failed during wallet provisioning:",
        walletError.message,
        walletError.data || ""
      );
      return NextResponse.json(
        {
          error:
            walletError.data?.message ||
            walletError.message ||
            "Customer registered, but failed to provision virtual bank account. Please retry.",
          details: walletError.data || null,
        },
        { status: walletError.status || 500 }
      );
    }
  } catch (error: any) {
    console.error("[NGN Account API] Unexpected unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

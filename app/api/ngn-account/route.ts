import { NextResponse } from "next/server";
import {
  createFossapayCustomer,
  createFossapayNgnWallet,
  createNgnAccountRecord,
  getNgnAccountByUserId,
  mapCountryCodeToName,
  refreshUserNgnAccountBalance,
  updateNgnAccountCustomerId,
  updateNgnAccountWallet,
} from "@/lib/functions/fossapayFunctions";
import { isUserKycVerified } from "@/lib/functions/kycFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { generateId } from "@/lib/schema-ids";
import { createNgnAccountSchema } from "@/lib/validations/fossapay.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/ngn-account
 * Returns the authenticated user's active FossaPay NGN account and live balance.
 */
export async function GET() {
  try {
    const auth = await requireActiveUser({
      requireWallet: false,
      rateLimit: { tier: "low", action: "ngn_account_get" },
    });
    if (!auth.ok) return auth.response;

    const result = await refreshUserNgnAccountBalance(auth.userId);

    if (!result.hasAccount) {
      return NextResponse.json(
        { hasAccount: false, message: "No NGN account found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[NGN Account API] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ngn-account
 * Safely creates a FossaPay customer + dedicated NGN virtual bank account
 */
export async function POST(req: Request) {
  try {
    const auth = await requireActiveUser({
      requireWallet: false,
      rateLimit: { tier: "high", action: "ngn_account_create" },
    });
    if (!auth.ok) return auth.response;

    // Verify user has completed KYC
    const kycVerified = await isUserKycVerified(auth.userId);
    if (!kycVerified) {
      return NextResponse.json(
        {
          error:
            "Please complete identity verification (KYC) before opening a Naira account.",
        },
        { status: 403 },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // 1. Validate form fields
    const parsed = createNgnAccountSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      console.warn("Validation error:", formatted);
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

    // 2. Check for existing active NgnAccount via helper function
    let existingAccount: any = await getNgnAccountByUserId(
      auth.userId,
      "fossapay",
    );

    if (
      existingAccount &&
      existingAccount.status === "active" &&
      existingAccount.accountNumber
    ) {
      console.log(
        "User already has active NGN account:",
        existingAccount.accountNumber,
      );
      return NextResponse.json(
        {
          success: true,
          account: existingAccount,
          message: "You already have an active NGN account",
        },
        { status: 200 },
      );
    }

    // Country mapped from user profile (fallback to Nigeria)
    const countryName = mapCountryCodeToName(auth.user.country || "NG");
    const userEmail = auth.user.email;

    if (!userEmail) {
      console.error("Authenticated user has no email address");
      return NextResponse.json(
        { error: "A verified email address is required on your profile" },
        { status: 400 },
      );
    }

    // 3. Step 1: Create FossaPay Customer (or reuse if previous attempt was recorded)
    let customerId = existingAccount?.providerCustomerId;

    if (!customerId) {
      console.log("Creating FossaPay customer...");
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
        console.log("customer created:", customerId);

        if (!existingAccount) {
          existingAccount = await createNgnAccountRecord({
            userId: auth.userId,
            currency: "NGN",
            provider: "fossapay",
            status: "pending",
            providerCustomerId: customerId,
            providerMetadata: {
              firstName,
              middleName,
              lastName,
              emailAddress: userEmail,
              mobileNumber,
              dateOfBirth,
              address,
              city,
              country: countryName,
            },
          });
        } else {
          existingAccount = await updateNgnAccountCustomerId(
            existingAccount._id.toString(),
            customerId,
          );
        }
      } catch (custError: any) {
        console.error(
          "Failed during customer creation:",
          custError.message,
          custError.data || "",
        );
        return NextResponse.json(
          {
            error:
              custError.data?.message ||
              custError.message ||
              "Failed to register customer profile",
            details: custError.data || null,
          },
          { status: custError.status || 500 },
        );
      }
    } else {
      console.log("Existing customer found, reusing ID:", customerId);
    }

    // 4. Step 2: Create FossaPay NGN Wallet
    console.log("Provisioning NGN wallet for customer:", customerId);

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

      console.log("Wallet created. Updating DB record:", existingAccount._id);

      const updatedAccount = await updateNgnAccountWallet(
        existingAccount._id.toString(),
        {
          providerAccountId: wallet.walletId,
          bankName: wallet.bankName,
          bankCode: wallet.bankCode,
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName,
          providerReference: walletReference,
        },
      );

      console.log("Account successfully activated:", {
        accountNumber: wallet.accountNumber,
        bankName: wallet.bankName,
      });

      return NextResponse.json(
        {
          success: true,
          account: updatedAccount,
          message: "NGN account activated successfully",
        },
        { status: 201 },
      );
    } catch (walletError: any) {
      console.error(
        "Failed during wallet provisioning:",
        walletError.message,
        walletError.data || "",
      );
      return NextResponse.json(
        {
          error:
            walletError.data?.message ||
            walletError.message ||
            "Customer registered, but failed to provision virtual bank account. Please retry.",
          details: walletError.data || null,
        },
        { status: walletError.status || 500 },
      );
    }
  } catch (error: any) {
    console.error("Unexpected unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { isUserKycVerified, getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { createBellmonieAccountSchema } from "@/lib/validations/bellmonie.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { getUserNgnAccountDetails } from "@/lib/functions/ngnFunctions";
import { createBellmonieIndividualAccount } from "@/lib/functions/bellmonieFunctions";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { User } from "@/models/User";
import {
  handleExternalApiError,
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/ngn-account
 * Returns the authenticated user's active Bellmonie NGN account and live balance.
 * Strictly projects clean client-safe DTOs with zero internal database or provider leakage.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      requireWallet: false,
      rateLimit: { tier: "low", action: "ngn_account_get" },
    });
    if (!auth.ok) return auth.response;

    const force = req.nextUrl?.searchParams?.get("refresh") === "true";
    const result = await getUserNgnAccountDetails(
      auth.userId,
      auth.user.name || "Jumpa User",
      { force, provider: "bellmonie" },
    );

    if (!result.account) {
      return NextResponse.json(
        {
          hasAccount: false,
          account: null,
          balance: null,
          canCreateBellmonie: true,
          message: "No active Naira account found",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        hasAccount: true,
        account: {
          bankName: result.account.bankName || "Bloc MFB",
          accountNumber: result.account.accountNumber,
          accountName: result.account.accountName,
          status: result.account.status || "active",
          provider: "bellmonie",
        },
        balance: result.balance,
        canCreateBellmonie: false,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Bellmonie",
      action: "GetAccount",
      status: 500,
      rawError: error,
      customMessage: "Unable to retrieve Naira account details. Please try again shortly.",
    });
  }
}

/**
 * POST /api/v1/ngn-account
 * Provisions a dedicated Bellmonie individual virtual account.
 * Enforces strictly 1 Bellmonie account per verified user.
 */
export async function POST(req: Request) {
  const PROVIDER = "Bellmonie";
  const ACTION = "CreateAccount";

  try {
    const auth = await requireActiveUser({
      requireWallet: false,
      rateLimit: { tier: "high", action: "ngn_account_create" },
    });
    if (!auth.ok) return auth.response;

    // 1. Verify user has completed KYC
    const kycVerified = await isUserKycVerified(auth.userId);
    if (!kycVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete identity verification first.",
        },
        { status: 403 },
      );
    }

    await connectDB();

    // 2. Enforce strict single Bellmonie account rule
    const existingBellmonie = await NgnAccount.findOne({
      userId: auth.userId,
      provider: "bellmonie",
      status: "active",
    }).lean();

    if (existingBellmonie && existingBellmonie.accountNumber) {
      return NextResponse.json(
        {
          success: true,
          account: {
            bankName: existingBellmonie.bankName || "Bloc MFB",
            accountNumber: existingBellmonie.accountNumber,
            accountName: existingBellmonie.accountName || auth.user.name || "Jumpa User",
            status: "active",
            provider: "bellmonie",
          },
          message: "You already have an active Naira account",
        },
        { status: 200 },
      );
    }

    // 3. Parse and validate payload
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const [freshUser, kycRecord] = await Promise.all([
      User.findById(auth.userId).lean(),
      getKycRecordByUserId(auth.userId),
    ]);
    const kycDetails = kycRecord?.details || {};

    // KYC & DB verified values take strict precedence over client body edits
    const verifiedFirstName = String(kycDetails.firstName || freshUser?.name?.split(" ")[0] || auth.user.name?.split(" ")[0] || body.firstName || "").trim();
    const verifiedLastName = String(kycDetails.lastName || freshUser?.name?.split(" ").slice(1).join(" ") || auth.user.name?.split(" ").slice(1).join(" ") || body.lastName || "").trim();
    const verifiedMiddleName = (kycDetails.middleName || body.middleName || undefined) ? String(kycDetails.middleName || body.middleName).trim() : undefined;
    const verifiedPhone = String(freshUser?.phoneNumber || auth.user.phoneNumber || body.phoneNumber || "").trim();
    const verifiedEmail = String(freshUser?.email || auth.user.email || body.emailAddress || "").trim();
    const verifiedBvn = String(body.bvn || "").trim();
    const rawDob = kycDetails.dateOfBirth || body.dateOfBirth || "";
    const normalizedDob = String(rawDob).replace(/-/g, "/").trim();
    const verifiedGender = ((kycDetails.gender ? String(kycDetails.gender).toLowerCase() : String(body.gender || "").toLowerCase()) === "female" ? "female" : "male") as "male" | "female";

    const kycAddress = typeof kycDetails.address === "object"
      ? [kycDetails.address?.street, kycDetails.address?.city, kycDetails.address?.state].filter(Boolean).join(", ")
      : (typeof kycDetails.address === "string" ? kycDetails.address : "");
    const verifiedAddress = String(kycAddress || body.address || "").trim();

    const registrationData = {
      firstName: verifiedFirstName,
      lastName: verifiedLastName,
      middleName: verifiedMiddleName,
      phoneNumber: verifiedPhone,
      emailAddress: verifiedEmail,
      address: verifiedAddress,
      bvn: verifiedBvn,
      gender: verifiedGender,
      dateOfBirth: normalizedDob,
    };

    const parsed = createBellmonieAccountSchema.safeParse(registrationData);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      return NextResponse.json({ success: false, error: formatted.error }, { status: 422 });
    }

    const validData = parsed.data;

    // 4. Create individual virtual account via Bellmonie API
    const clientData = await createBellmonieIndividualAccount({
      firstname: validData.firstName,
      lastname: validData.lastName,
      middlename: validData.middleName,
      phoneNumber: validData.phoneNumber,
      emailAddress: validData.emailAddress,
      address: validData.address,
      bvn: validData.bvn,
      gender: validData.gender,
      dateOfBirth: validData.dateOfBirth,
      metadata: { userId: auth.userId },
    });

    // 5. Upsert in MongoDB
    await NgnAccount.findOneAndUpdate(
      { userId: auth.userId, provider: "bellmonie" },
      {
        $set: {
          currency: "NGN",
          provider: "bellmonie",
          status: "active",
          bankName: "Bloc MFB",
          accountNumber: clientData.accountNumber,
          accountName: clientData.accountName,
          providerCustomerId: String(clientData.id),
          providerReference: clientData.externalReference,
          providerMetadata: {
            bvn: clientData.bvn,
            gender: clientData.gender,
            validityType: clientData.validityType,
            clientCreatedAt: clientData.createdAt,
          },
        },
        $setOnInsert: {
          balance: 0,
        },
      },
      { returnDocument: "after", upsert: true },
    );

    // 6. Return minimal, client-safe DTO (no raw Mongoose doc, no BVN leak)
    return NextResponse.json(
      {
        success: true,
        account: {
          bankName: "Bloc MFB",
          accountNumber: clientData.accountNumber,
          accountName: clientData.accountName,
          status: "active",
          provider: "bellmonie",
        },
        message: "Naira virtual account created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    const rawErrorText = String(error?.message || error?.data?.message || "");

    // Intercept specific BVN validation mismatch from Bellmonie
    if (
      error.status === 400 ||
      /bvn validation failed|invalid bvn|bvn.*not match/i.test(rawErrorText)
    ) {
      console.error(
        `[${PROVIDER}:${ACTION}] Upstream failure | Status: 400 | Payload: ${formatOneLineError(error.data || error.message)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "The BVN provided does not match your registered identity details",
        },
        { status: 400 },
      );
    }

    if (isTimeoutError(error) || error.status === 504) {
      return handleExternalApiError({
        provider: PROVIDER,
        action: ACTION,
        status: 504,
        rawError: error,
        customMessage:
          "The request timed out while contacting the banking provider. Please check your connection and try again.",
      });
    }

    if (error.status >= 500) {
      return handleExternalApiError({
        provider: PROVIDER,
        action: ACTION,
        status: 502,
        rawError: error,
        customMessage:
          "The banking service is temporarily unavailable. Please try again shortly.",
      });
    }

    return handleExternalApiError({
      provider: PROVIDER,
      action: ACTION,
      status: error.status || 500,
      rawError: error,
      customMessage:
        "We could not complete your account request at this time. Please try again later.",
    });
  }
}

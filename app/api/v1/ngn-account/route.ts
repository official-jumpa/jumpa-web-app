import { NextRequest, NextResponse } from "next/server";
import { isUserKycVerified, getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { createAellaAccountSchema } from "@/lib/validations/aella.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { getUserNgnAccountDetails } from "@/lib/functions/ngnFunctions";
import {
  resolveAellaBvn,
  createAellaStaticAccount,
} from "@/lib/functions/aellaFunctions";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { KYCSchema } from "@/models/KYCSchema";
import {
  handleExternalApiError,
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/ngn-account
 * Returns the authenticated user's active NGN account (prioritizing Aella MFB) and live balance.
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
      { force },
    );

    if (!result.account) {
      return NextResponse.json(
        {
          hasAccount: false,
          account: null,
          balance: null,
          canCreateAccount: true,
          message: "No active Naira account found",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        hasAccount: true,
        account: {
          bankName: result.account.bankName || "Aella MFB",
          accountNumber: result.account.accountNumber,
          accountName: result.account.accountName,
          status: result.account.status || "active",
          provider: result.account.provider || "aella",
        },
        balance: result.balance,
        canCreateAccount: false,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Aella",
      action: "GetAccount",
      status: 500,
      rawError: error,
      customMessage: "Unable to retrieve Naira account details. Please try again shortly.",
    });
  }
}

/**
 * POST /api/v1/ngn-account
 * Provisions a dedicated Aella MFB static virtual account.
 * Requires an 11-digit BVN.
 */
export async function POST(req: Request) {
  const PROVIDER = "Aella";
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

    // 2. Check if user already has an active Aella account
    const existingAella = await NgnAccount.findOne({
      userId: auth.userId,
      provider: "aella",
      status: "active",
    }).lean();

    if (existingAella && existingAella.accountNumber) {
      return NextResponse.json(
        {
          success: true,
          account: {
            bankName: existingAella.bankName || "Aella MFB",
            accountNumber: existingAella.accountNumber,
            accountName: existingAella.accountName || auth.user.name || "Jumpa User",
            status: "active",
            provider: "aella",
          },
          message: "You already have an active Naira account",
        },
        { status: 200 },
      );
    }

    // 3. Parse and validate payload (strict BVN validation)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = createAellaAccountSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodError(parsed.error);
      return NextResponse.json({ success: false, error: formatted.error }, { status: 422 });
    }

    const cleanBvn = parsed.data.bvn;

    // 4. Resolve BVN via Aella Identity (NIBSS)
    let resolvedBvn;
    try {
      resolvedBvn = await resolveAellaBvn(cleanBvn);
    } catch (bvnError: any) {
      console.error(
        `[${PROVIDER}:${ACTION}] BVN resolution failed for user ${auth.userId}: ${formatOneLineError(bvnError)}`,
      );
      const rawMsg = String(bvnError?.message || bvnError?.data?.message || "");
      const is404OrMismatch = /invalid|not found|does not exist|11 characters/i.test(rawMsg);

      return NextResponse.json(
        {
          success: false,
          error: is404OrMismatch
            ? "The BVN provided is invalid. Please verify your 11-digit BVN and try again."
            : "BVN verification failed. Please try again shortly.",
        },
        { status: 400 },
      );
    }

    // 5. Auto-heal missing DOB in user KYC profile if it wasn't populated (e.g. international passport)
    if (resolvedBvn.dateOfBirth) {
      try {
        await KYCSchema.findOneAndUpdate(
          { userId: auth.userId, "details.dateOfBirth": { $in: [null, "", undefined] } },
          {
            $set: {
              "details.dateOfBirth": resolvedBvn.dateOfBirth,
              ...(resolvedBvn.gender ? { "details.gender": resolvedBvn.gender } : {}),
            },
          },
        );
      } catch (healErr) {
        console.warn("[Aella] Non-blocking KYC DOB auto-heal failure:", healErr);
      }
    }

    // 6. Create Static Virtual Account at Aella MFB
    const aellaAccount = await createAellaStaticAccount({
      firstName: resolvedBvn.firstName,
      lastName: resolvedBvn.lastName,
      middleName: resolvedBvn.middleName || "",
      bvn: cleanBvn,
      dob: resolvedBvn.dateOfBirth,
      gender: resolvedBvn.gender === "Female" ? "Female" : "Male",
    });

    // 7. Upsert in MongoDB NgnAccount
    await NgnAccount.findOneAndUpdate(
      { userId: auth.userId, provider: "aella" },
      {
        $set: {
          currency: "NGN",
          provider: "aella",
          status: "active",
          bankName: aellaAccount.bankName || "Aella MFB",
          bankCode: "090614",
          accountNumber: aellaAccount.accountNumber,
          accountName: aellaAccount.accountName,
          providerAccountId: String(aellaAccount.id),
          providerMetadata: {
            bvn: cleanBvn,
            gender: resolvedBvn.gender,
            dateOfBirth: resolvedBvn.dateOfBirth,
            createdAt: new Date().toISOString(),
          },
        },
        $setOnInsert: {
          balance: 0,
        },
      },
      { returnDocument: "after", upsert: true },
    );

    // 8. Return minimal, client-safe DTO
    return NextResponse.json(
      {
        success: true,
        account: {
          bankName: aellaAccount.bankName || "Aella MFB",
          accountNumber: aellaAccount.accountNumber,
          accountName: aellaAccount.accountName,
          status: "active",
          provider: "aella",
        },
        message: "Naira virtual account created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (isTimeoutError(error) || error.status === 504) {
      return handleExternalApiError({
        provider: PROVIDER,
        action: ACTION,
        status: 504,
        rawError: error,
        customMessage:
          "The request timed out while contacting the Bank. Please try again shortly.",
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
        error.message ||
        "We could not complete your account request at this time. Please try again later.",
    });
  }
}

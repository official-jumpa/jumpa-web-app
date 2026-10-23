import { NextRequest, NextResponse } from "next/server";
import { isUserKycVerified, getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { createAellaAccountSchema } from "@/lib/validations/aella.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { getUserNgnAccountDetails } from "@/lib/functions/ngnFunctions";
import {
  createAellaStaticAccount,
  resolveAellaBvn,
} from "@/lib/functions/aellaFunctions";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { KYCSchema } from "@/models/KYCSchema";
import { User } from "@/models/User";
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

    // 4. Fetch user's verified KYC record
    const kycRecord = await getKycRecordByUserId(auth.userId);
    if (!kycRecord || !kycRecord.details) {
      return NextResponse.json(
        { success: false, error: "Please complete identity verification first." },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const isResolveOnly = url.searchParams.get("resolve") === "true";

    if (isResolveOnly) {
      // 1. Check if user already has complete names, gender, and DOB in KYC
      const hasCompleteDetails =
        Boolean(kycRecord.details.firstName?.trim()) &&
        Boolean(kycRecord.details.lastName?.trim()) &&
        Boolean(kycRecord.details.gender) &&
        Boolean(kycRecord.details.dateOfBirth);

      if (hasCompleteDetails) {
        return NextResponse.json({
          success: true,
          resolved: true,
          details: {
            firstName: kycRecord.details.firstName!.trim(),
            lastName: kycRecord.details.lastName!.trim(),
            middleName: kycRecord.details.middleName?.trim() || "",
            gender: kycRecord.details.gender,
            dateOfBirth: kycRecord.details.dateOfBirth,
            fullName:
              kycRecord.details.fullName ||
              `${kycRecord.details.firstName} ${kycRecord.details.lastName}`,
          },
          bvn: cleanBvn,
        });
      }

      // 2. Incomplete KYC: Resolve legal identity details via Aella Identity (NIBSS)
      const bvnData = await resolveAellaBvn(cleanBvn);
      const effectiveDob = kycRecord.details.dateOfBirth || bvnData.dateOfBirth;
      const fullName = `${bvnData.firstName} ${bvnData.middleName ? bvnData.middleName + " " : ""}${bvnData.lastName}`.trim();

      // 3. Immediately persist to KYCSchema so this paid check never needs to run again
      await KYCSchema.updateOne(
        { userId: auth.userId },
        {
          $set: {
            "details.firstName": bvnData.firstName,
            "details.lastName": bvnData.lastName,
            "details.middleName": bvnData.middleName,
            "details.gender": bvnData.gender,
            "details.dateOfBirth": effectiveDob,
            "details.fullName": fullName,
            idType: "bvn",
            idNumber: cleanBvn,
          },
        },
      );

      // 4. Sync verified name to User profile
      await User.findByIdAndUpdate(auth.userId, {
        $set: { name: fullName },
      });

      return NextResponse.json({
        success: true,
        resolved: true,
        details: {
          firstName: bvnData.firstName,
          lastName: bvnData.lastName,
          middleName: bvnData.middleName,
          gender: bvnData.gender,
          dateOfBirth: effectiveDob,
          fullName,
        },
        bvn: cleanBvn,
      });
    }

    // 5. Verify DOB: Existing DB DOB takes absolute precedence. Only accept submitted DOB if DB has none.
    let effectiveDob = kycRecord.details.dateOfBirth;

    if (!effectiveDob) {
      if (!parsed.data.dob) {
        return NextResponse.json(
          {
            success: false,
            error: "Date of birth is required to create your Nigerian bank account.",
          },
          { status: 422 },
        );
      }

      const birthDate = new Date(parsed.data.dob);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageYears = ageDiff / (1000 * 60 * 60 * 24 * 365.25);
      if (isNaN(birthDate.getTime()) || ageYears < 18) {
        return NextResponse.json(
          {
            success: false,
            error: "You must be at least 18 years old to open an account.",
          },
          { status: 422 },
        );
      }

      effectiveDob = parsed.data.dob;

      // Persist permanently to KYC record so it is locked in for future operations
      await KYCSchema.updateOne(
        { userId: auth.userId },
        { $set: { "details.dateOfBirth": effectiveDob } },
      );
    }

    // 6. Extract verified identity details strictly from KYC (heal if missing)
    let firstName = kycRecord.details.firstName?.trim();
    let lastName = kycRecord.details.lastName?.trim();
    let middleName = kycRecord.details.middleName?.trim() || "";
    let rawGender = String(kycRecord.details.gender || "").toLowerCase().trim();

    if (
      !firstName ||
      !lastName ||
      (rawGender !== "male" && rawGender !== "m" && rawGender !== "female" && rawGender !== "f")
    ) {
      // Auto-resolve via BVN if identity details are still incomplete
      const bvnData = await resolveAellaBvn(cleanBvn);
      firstName = bvnData.firstName;
      lastName = bvnData.lastName;
      middleName = bvnData.middleName || "";
      rawGender = bvnData.gender.toLowerCase();
      effectiveDob = effectiveDob || bvnData.dateOfBirth;

      await KYCSchema.updateOne(
        { userId: auth.userId },
        {
          $set: {
            "details.firstName": firstName,
            "details.lastName": lastName,
            "details.middleName": middleName,
            "details.gender": bvnData.gender,
            "details.dateOfBirth": effectiveDob,
            "details.fullName": `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim(),
            idType: "bvn",
            idNumber: cleanBvn,
          },
        },
      );

      await User.findByIdAndUpdate(auth.userId, {
        $set: { name: `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim() },
      });
    }

    const gender: "Male" | "Female" =
      rawGender === "female" || rawGender === "f" ? "Female" : "Male";

    // 7. Create Static Virtual Account at Aella MFB
    const aellaAccount = await createAellaStaticAccount({
      firstName,
      lastName,
      middleName,
      bvn: cleanBvn,
      dob: effectiveDob,
      gender,
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
            gender,
            dateOfBirth: effectiveDob,
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

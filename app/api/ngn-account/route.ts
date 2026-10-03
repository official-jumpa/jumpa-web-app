import { NextRequest, NextResponse } from "next/server";
import { isUserKycVerified, getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { createBellmonieAccountSchema } from "@/lib/validations/bellmonie.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  getUserNgnAccountDetails,
  getUserNgnAccount,
} from "@/lib/functions/ngnFunctions";
import {
  createBellmonieIndividualAccount,
  getOrCreateUserBellmonieAccount,
} from "@/lib/functions/bellmonieFunctions";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { User } from "@/models/User";

/**
 * GET /api/ngn-account
 * Returns the authenticated user's active NGN account, live balance, and all accounts.
 * Defaults to primary provider "bellmonie" (falling back to "fossapay"), or accepts ?provider=bellmonie|fossapay
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      requireWallet: false,
      rateLimit: { tier: "low", action: "ngn_account_get" },
    });
    if (!auth.ok) return auth.response;

    const force = req.nextUrl?.searchParams?.get("refresh") === "true";
    const requestedProvider = req.nextUrl?.searchParams?.get("provider") as
      | "bellmonie"
      | "fossapay"
      | undefined;

    const result = await getUserNgnAccountDetails(
      auth.userId,
      auth.user.name || "Jumpa User",
      { force, provider: requestedProvider },
    );

    if (!result.account) {
      return NextResponse.json(
        { hasAccount: false, message: "No NGN account found", canCreateBellmonie: true },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        hasAccount: true,
        account: result.account,
        balance: result.balance,
        accounts: result.accounts || [],
        activeProvider: result.activeProvider,
        canCreateBellmonie: result.canCreateBellmonie,
      },
      { status: 200 },
    );
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
 * Exclusively creates a Bellmonie individual virtual account.
 * Enforces strictly 1 Bellmonie account per user.
 */
export async function POST(req: Request) {
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
          error:
            "Please complete identity verification (KYC) before opening a Naira account.",
        },
        { status: 403 },
      );
    }

    await connectDB();

    // 2. Enforce strict single Bellmonie account rule
    const existingBellmonie = await NgnAccount.findOne({
      userId: auth.userId,
      provider: "bellmonie",
    }).lean();

    if (
      existingBellmonie &&
      existingBellmonie.status === "active" &&
      existingBellmonie.accountNumber
    ) {
      return NextResponse.json(
        {
          success: true,
          account: existingBellmonie,
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

    // Retrieve fresh user and KYC details directly from DB
    const [freshUser, kycRecord] = await Promise.all([
      User.findById(auth.userId).lean(),
      getKycRecordByUserId(auth.userId),
    ]);
    const kycDetails = kycRecord?.details || {};

    // DB / KYC verified values take strict precedence over any user client-side edits
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
      console.warn("[Bellmonie Creation] Validation error:", formatted);
      return NextResponse.json(formatted, { status: 422 });
    }

    const validData = parsed.data;

    console.log(` ✅[Bellmonie Provision] Creating virtual account for user ${auth.userId} (${validData.emailAddress}) phone no (${validData.phoneNumber})`);

    // 4. Create individual virtual account via Bellmonie API (using only BVN)
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

    // 5. Store / update in MongoDB
    const updatedAccount = await NgnAccount.findOneAndUpdate(
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

    console.log(`[Bellmonie Provision] ✅ Account activated successfully for ${auth.userId}: ${clientData.accountNumber}`);

    return NextResponse.json(
      {
        success: true,
        account: updatedAccount,
        message: "Bellmonie virtual account opened successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Bellmonie Account API] Unexpected unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Bellmonie account" },
      { status: 500 },
    );
  }
}

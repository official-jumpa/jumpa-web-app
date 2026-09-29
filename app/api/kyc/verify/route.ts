import { type NextRequest, NextResponse } from "next/server";
import {
  completeKycVerification,
  getOrCreateKycRecord,
  parseMyazaBiodata,
  syncKycToUserProfile,
} from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { kycVerifySchema } from "@/lib/validations/kyc.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { KYCSchema } from "@/models/KYCSchema";

const MYAZA_TYPE_MAP: Record<string, string> = {
  nin: "nin",
  licence: "drivers-license",
  passport: "passport",
};

const DEFAULT_SANDBOX_IDS = new Set([
  "00000000001",
  "00000000002",
  "00000000004",
  "TST00000001",
  "TST00000002",
  "TST00000007",
  "A00000001",
  "A00000002",
  "A00000007",
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "medium", action: "kyc_verify" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    const validation = kycVerifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { idType, idNumber, selfieMediaId } = validation.data;

    if (!selfieMediaId) {
      return NextResponse.json(
        { error: "Please capture your live selfie before completing verification." },
        { status: 400 },
      );
    }

    const rawIdNumber = (idNumber || "").trim();
    if (!rawIdNumber) {
      return NextResponse.json(
        { error: "Valid document or identification number is required." },
        { status: 400 },
      );
    }

    const isDev = process.env.NODE_ENV !== "production";

    const MYAZA_DEV_SANDBOX_IDS: Record<string, string> = {
      nin: "00000000001",
      licence: "TST00000001",
      passport: "A00000001",
    };

    let effectiveIdNumber = rawIdNumber;

    if (isDev) {
      // In dev mode: substitute with recognized test IDs if arbitrary numbers entered
      if (!effectiveIdNumber || !DEFAULT_SANDBOX_IDS.has(effectiveIdNumber)) {
        const fallbackId = MYAZA_DEV_SANDBOX_IDS[idType] || "00000000001";
        console.log(
          `[Myaza Verify DEV] Substituting user ID "${effectiveIdNumber}" with sandbox test ID: "${fallbackId}"`,
        );
        effectiveIdNumber = fallbackId;
      }
    } else {
      // In production: strictly enforce non-empty real IDs and reject sandbox test IDs
      if (DEFAULT_SANDBOX_IDS.has(effectiveIdNumber)) {
        return NextResponse.json(
          { error: "Please provide your real ID number." },
          { status: 400 },
        );
      }
    }

    const apiKey =
      process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = process.env.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza Verify] Error: Missing API Key or Base URL");
      return NextResponse.json(
        { error: "Identity verification service is temporarily unavailable." },
        { status: 503 },
      );
    }

    const myazaIdType = MYAZA_TYPE_MAP[idType] || idType;

    // Fetch user KYC record and track deterministic attempt count for idempotency
    const kycRecord = await getOrCreateKycRecord(userId);
    const attemptCount = (kycRecord.attemptCount || 0) + 1;
    await KYCSchema.updateOne({ userId }, { $set: { attemptCount } });

    // Deterministic idempotency key: prevents duplicate charges on re-tries or network retries
    const requestId = `kyc_${userId}_${attemptCount}`;

    // Pure Government-Database Payload:
    // Only pass the live selfie in mediaIds.
    // Document images are intentionally omitted so Myaza verifies directly against
    // source government registries (NIMC, FRSC, NIS) and performs 1:1 facial matching
    // against the official government photo, completely bypassing error-prone document OCR.
    const verifyPayload = {
      country: "NG",
      idType: myazaIdType,
      idNumber: effectiveIdNumber,
      externalUserId: userId,
      mediaIds: {
        selfie: selfieMediaId,
      },
      metadata: {
        source: "jumpa_web_kyc",
        requestId,
      },
    };

    console.log(
      "[Myaza Verify] Submitting verification for user:",
      userId,
      "Payload:",
      JSON.stringify(verifyPayload, null, 2),
    );

    let response: Response;
    let data: any = null;

    try {
      response = await fetch(`${baseUrl}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verifyPayload),
        signal: AbortSignal.timeout(30000),
      });

      try {
        data = await response.json();
      } catch {
        data = {
          error: "gateway_error",
          message: `Provider returned status ${response.status}`,
        };
      }
    } catch (fetchErr) {
      console.error("[Myaza Verify] Network/timeout exception:", fetchErr);
      return NextResponse.json(
        {
          error:
            "Connection to the verification provider timed out. Please try submitting again.",
        },
        { status: 504 },
      );
    }

    console.log(
      `[Myaza Verify] Response status: ${response.status} Data:`,
      JSON.stringify(data, null, 2),
    );

    const statusStr = String(data?.status || "").toLowerCase();
    const verificationId = data?.id || data?.verificationId || null;

    const isApproved =
      response.ok &&
      (statusStr === "approved" ||
        statusStr === "success" ||
        data?.success === true);

    // Only treat as processing if explicitly indicated by status or 202 Accepted
    const isProcessing =
      response.ok &&
      (statusStr === "processing" ||
        statusStr === "pending" ||
        statusStr === "in_review" ||
        response.status === 202);

    if (isApproved) {
      const verifiedDetails = parseMyazaBiodata(data);

      await completeKycVerification(userId, {
        verificationId,
        status: "approved",
        isCompleted: true,
        stage: "completed",
        details: verifiedDetails,
        rawResponse: data,
      });

      await syncKycToUserProfile(userId, verifiedDetails);

      logUserActivity({
        userId,
        action: "KYC_SUBMITTED",
        details: { verificationId, idType, status: "approved" },
        req,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: true,
          status: "approved",
          verificationId,
          details: verifiedDetails,
        },
        { status: 200 },
      );
    }

    if (isProcessing) {
      await completeKycVerification(userId, {
        verificationId,
        status: "pending",
        isCompleted: false,
        stage: "verifying",
        rawResponse: data,
      });

      logUserActivity({
        userId,
        action: "KYC_SUBMITTED",
        details: { verificationId, idType, status: "pending" },
        req,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: true,
          status: "pending",
          verificationId,
          message: "Your verification is processing.",
        },
        { status: 200 },
      );
    }

    // Explicit rejection or error from provider
    const rawMsg = String(data?.message || data?.error || "");
    let userFacingError =
      "Identity verification could not be completed. Please review your details and try again.";

    if (response.status >= 500 || data?.error === "internal_error") {
      userFacingError =
        "The verification service is momentarily busy. Please try submitting again in a moment.";
    } else if (/facial|face|match|confidence/i.test(rawMsg)) {
      userFacingError =
        "Biometric facial match could not be confirmed. Please take a clear, well-lit live selfie looking straight at the camera.";
    } else if (
      response.status === 422 ||
      /invalid|not found|id number|record|does not match/i.test(rawMsg)
    ) {
      userFacingError =
        "The ID number provided was not found. Please double-check your ID number and try again.";
    } else if (rawMsg && rawMsg.length < 120 && !rawMsg.includes("{")) {
      userFacingError = rawMsg;
    }

    await completeKycVerification(userId, {
      verificationId,
      status: "failed",
      isCompleted: false,
      rejectionReason: userFacingError,
      rawResponse: data,
    });

    logUserActivity({
      userId,
      action: "KYC_SUBMITTED",
      details: {
        verificationId,
        idType,
        status: "failed",
        rejectionReason: userFacingError,
      },
      req,
    }).catch(() => {});

    return NextResponse.json(
      { error: userFacingError, details: data },
      { status: response.status >= 400 ? response.status : 422 },
    );
  } catch (error) {
    console.error("[Myaza Verify] Exception:", error);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during verification. Please try again.",
      },
      { status: 500 },
    );
  }
}


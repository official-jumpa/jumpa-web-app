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
import {
  formatOneLineError,
  handleExternalApiError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";
import { environment } from "@/lib/environment";

const VERIFY_TIMEOUT_MS = 15000; // 15s budget for identity matching

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

    const {
      idType,
      idNumber,
      docMediaId,
      docBackMediaId,
      selfieMediaId,
    } = validation.data;

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

    const isDev = !environment.IS_PRODUCTION;
    const MYAZA_DEV_SANDBOX_IDS: Record<string, string> = {
      nin: "00000000001",
      licence: "TST00000001",
      passport: "A00000001",
    };

    let effectiveIdNumber = rawIdNumber;
    if (isDev) {
      // In test/sandbox environment, prefill backend test ID unless the caller specifically
      // sent an alternate canned test ID scenario (e.g. ...00000002 for Not Found, ...00000007 for Expired)
      if (!DEFAULT_SANDBOX_IDS.has(effectiveIdNumber)) {
        effectiveIdNumber = MYAZA_DEV_SANDBOX_IDS[idType] || "00000000001";
      }
    } else {
      if (DEFAULT_SANDBOX_IDS.has(effectiveIdNumber)) {
        return NextResponse.json(
          { error: "Please provide your real ID number." },
          { status: 400 },
        );
      }
    }

    const apiKey =
      environment.MYAZA_TRUST_SECRET_KEY || environment.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = environment.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza] Missing API credentials");
      return NextResponse.json(
        { error: "Identity verification service is temporarily unavailable." },
        { status: 503 },
      );
    }

    const myazaIdType = MYAZA_TYPE_MAP[idType] || idType;

    const kycRecord = await getOrCreateKycRecord(userId);
    const attemptCount = (kycRecord.attemptCount || 0) + 1;
    await KYCSchema.updateOne(
      { userId },
      {
        $set: {
          attemptCount,
          idType,
          idNumber: rawIdNumber,
          ...(docMediaId ? { docMediaId } : {}),
          ...(docBackMediaId ? { docBackMediaId } : {}),
          selfieMediaId,
        },
      },
    );

    const requestId = `kyc_${userId}_${attemptCount}`;

    // Assemble media payload: NIN is number-only (selfie), while license/passport require documentFront (+ documentBack)
    const mediaIdsPayload: Record<string, string> = {
      selfie: selfieMediaId,
    };

    if (idType !== "nin") {
      if (docMediaId) {
        mediaIdsPayload.documentFront = docMediaId;
      }
      if (docBackMediaId) {
        mediaIdsPayload.documentBack = docBackMediaId;
      }
    }

    // Verified against source government databases (NIN) or Document Intelligence (License/Passport)
    const verifyPayload = {
      country: "NG",
      idType: myazaIdType,
      idNumber: effectiveIdNumber,
      externalUserId: userId,
      mediaIds: mediaIdsPayload,
      metadata: {
        source: "jumpa_web_kyc",
        requestId,
      },
    };

    console.log(
      `[Myaza] Submitting verification for ${userId}: ${formatOneLineError(verifyPayload)}`,
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
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });

      try {
        data = await response.json();
      } catch {
        data = {
          error: "gateway_error",
          message: `Provider returned status ${response.status}`,
        };
      }

      console.log(
        `[Myaza] Upstream response [HTTP ${response.status}]: ${formatOneLineError(data)}`,
      );
    } catch (fetchErr: any) {
      const isTimeout = isTimeoutError(fetchErr);
      console.error(
        `[Myaza] ${isTimeout ? `Verification timed out after ${VERIFY_TIMEOUT_MS}ms` : "Network exception"}:`,
        fetchErr,
      );
      return NextResponse.json(
        {
          error: isTimeout
            ? "Connection timed out. Please try submitting again."
            : "Unable to reach verification service. Please check your internet connection.",
        },
        { status: isTimeout ? 504 : 502 },
      );
    }

    const statusStr = String(data?.status || "").toLowerCase();
    const verificationId = data?.id || data?.verificationId || null;

    const isApproved =
      response.ok &&
      (statusStr === "approved" ||
        statusStr === "verified" ||
        statusStr === "success" ||
        statusStr === "completed" ||
        statusStr === "passed" ||
        data?.success === true);

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
          message: "Your verification is currently processing.",
        },
        { status: 200 },
      );
    }

    // Intercept failure from provider and map to friendly copy
    const rawMsg = String(data?.message || data?.error || "");
    let userFacingError =
      "Identity verification could not be completed. Please review your details and try again.";

    if (response.status >= 500 || data?.error === "internal_error") {
      userFacingError =
        "The verification service is momentarily busy. Please try submitting again in a moment.";
    } else if (/facial|face|match|confidence/i.test(rawMsg)) {
      userFacingError =
        "Facial match could not be confirmed. Please take a clear, well-lit live selfie looking straight at the camera.";
    } else if (
      response.status === 422 ||
      /invalid|not found|id number|record|does not match/i.test(rawMsg)
    ) {
      userFacingError =
        "The ID number provided was not found. Please double-check your ID number and try again.";
    } else if (rawMsg && rawMsg.length < 120 && !rawMsg.includes("{")) {
      userFacingError = rawMsg;
    }

    console.error(
      `[Myaza] Upstream failure | Status: ${response.status} | Payload: ${formatOneLineError(data)}`,
    );

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

    // Return sanitized error copy without leaking raw data
    return NextResponse.json(
      { error: userFacingError },
      { status: response.status >= 400 && response.status < 600 ? response.status : 422 },
    );
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Myaza",
      action: "verify",
      status: 500,
      rawError: error,
      customMessage: "An unexpected error occurred during verification. Please try again.",
    });
  }
}

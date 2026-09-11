import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  completeKycVerification,
  syncKycToUserProfile,
} from "@/lib/functions/kycFunctions";
import { kycVerifySchema } from "@/lib/validations/kyc.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import type { IKycDetails } from "@/models/KYCSchema";

const MYAZA_TYPE_MAP: Record<string, string> = {
  nin: "nin",
  licence: "drivers-license",
  passport: "passport",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. User must be authenticated." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const validation = kycVerifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { idType, idNumber, docMediaId, selfieMediaId } = validation.data;
    const apiKey = process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = process.env.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza Upload] Error: Missing API Key or Base URL");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
      );
    }
    const myazaIdType = MYAZA_TYPE_MAP[idType] || idType;

    // Build verification payload for Myaza REST API NIGERIA ONLY for now
    const verifyPayload = {
      country: "NG",
      idType: myazaIdType,
      idNumber,
      externalUserId: session.user.id,
      mediaIds: { documentFront: docMediaId, selfie: selfieMediaId },
      metadata: { source: "jumpa_web_kyc", requestId: `req_${Date.now()}` },
    };

    console.log(
      "[Myaza Verify] Submitting verification for user:",
      session.user.id,
      "Payload:",
      JSON.stringify(verifyPayload, null, 2),
    );

    const response = await fetch(`${baseUrl}/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verifyPayload),
    });

    const data = await response.json();
    console.log("[Myaza Verify] Response from provider:", data);

    const isSuccess =
      response.ok &&
      (data.status === "approved" ||
        data.status === "success" ||
        data.success === true ||
        data.id ||
        data.verificationId);

    const verificationId = data.id || data.verificationId || null;

    if (!isSuccess) {
      const errorMsg =
        data.message || data.error || "Identity verification failed";
      await completeKycVerification(session.user.id, {
        verificationId,
        status: "failed",
        isCompleted: false,
        rejectionReason: errorMsg,
        rawResponse: data,
      });

      return NextResponse.json(
        { error: errorMsg, details: data },
        { status: response.status >= 400 ? response.status : 422 },
      );
    }

    // Extract biodata returned from government database verification
    const resultObj = data.result || data.data || data;
    const verifiedDetails: IKycDetails = {
      firstName: resultObj.firstName || null,
      middleName: resultObj.middleName || null,
      lastName: resultObj.lastName || null,
      fullName:
        resultObj.fullName ||
        [resultObj.firstName, resultObj.middleName, resultObj.lastName]
          .filter(Boolean)
          .join(" ") ||
        null,
      dateOfBirth: resultObj.dateOfBirth || resultObj.dob || null,
      gender: resultObj.gender || null,
      phone: resultObj.phone || resultObj.phoneNumber || null,
      address: resultObj.address
        ? {
          street: resultObj.address.street || null,
          city: resultObj.address.city || null,
          state: resultObj.address.state || null,
          postalCode: resultObj.address.postalCode || null,
          country: resultObj.address.country || null,
        }
        : undefined,
      nationality: resultObj.nationality || resultObj.country || null,
      photoUrl: resultObj.photo || resultObj.photoUrl || null,
      dataMatch: Boolean(resultObj.dataMatch ?? true),
      facialMatchConfidence:
        typeof resultObj.facialMatch?.confidence === "number"
          ? resultObj.facialMatch.confidence
          : typeof resultObj.confidence === "number"
            ? resultObj.confidence
            : null,
    };

    // Finalize KYC verification in database
    await completeKycVerification(session.user.id, {
      verificationId,
      status: "approved",
      isCompleted: true,
      stage: "completed",
      details: verifiedDetails,
      rawResponse: data,
    });

    // Sync verified details to User profile
    await syncKycToUserProfile(session.user.id, verifiedDetails);

    return NextResponse.json(
      {
        success: true,
        status: "approved",
        verificationId,
        details: verifiedDetails,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Myaza Verify] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error during verification" },
      { status: 500 },
    );
  }
}

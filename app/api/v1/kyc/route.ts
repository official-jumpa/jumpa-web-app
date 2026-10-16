import { NextRequest, NextResponse } from "next/server";
import {
  checkMyazaVerificationStatus,
  completeKycVerification,
  getCachedKycRecord,
  getOrCreateKycRecord,
  parseMyazaBiodata,
  setCachedKycRecord,
  syncKycToUserProfile,
} from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { formatOneLineError, handleExternalApiError } from "@/lib/utils/api-best-practices";

/**
 * Projects a raw database KYC record into a minimal, client-safe DTO.
 * Explicitly strips sensitive fields.
 */
function toClientKycDto(record: any) {
  if (!record) {
    return {
      isCompleted: false,
      status: null,
      verificationId: null,
      docMediaId: null,
      selfieMediaId: null,
      idNumber: null,
      rejectionReason: null,
    };
  }

  const isCompleted = Boolean(
    record.isCompleted ||
      record.status === "approved" ||
      record.stage === "completed"
  );

  return {
    isCompleted,
    status: record.status || null,
    verificationId: record.verificationId || null,
    docMediaId: record.docMediaId || null,
    selfieMediaId: record.selfieMediaId || null,
    idNumber: record.idNumber || null,
    rejectionReason: record.rejectionReason || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "low", action: "kyc_status" },
    });
    if (!auth.ok) return auth.response;

    const bypassCache = req.nextUrl.searchParams.get("refresh") === "true";
    if (!bypassCache) {
      const cached = await getCachedKycRecord(auth.userId);
      if (cached && (cached.isCompleted || cached.status === "approved")) {
        return NextResponse.json(toClientKycDto(cached), { status: 200 });
      }
    }

    let kycRecord = await getOrCreateKycRecord(auth.userId);

    // If verification is currently pending and has verificationId, check Myaza for finalized status
    if (
      (kycRecord.status === "pending" || kycRecord.stage === "verifying") &&
      kycRecord.verificationId
    ) {
      try {
        const myazaData = await checkMyazaVerificationStatus(
          kycRecord.verificationId
        );
        if (myazaData) {
          const statusStr = String(myazaData.status || "").toLowerCase();
          if (
            statusStr === "approved" ||
            statusStr === "success" ||
            myazaData.success === true
          ) {
            const verifiedDetails = parseMyazaBiodata(myazaData);
            await completeKycVerification(auth.userId, {
              verificationId: kycRecord.verificationId,
              status: "approved",
              isCompleted: true,
              stage: "completed",
              details: verifiedDetails,
              rawResponse: myazaData,
            });
            await syncKycToUserProfile(auth.userId, verifiedDetails);
            kycRecord = await getOrCreateKycRecord(auth.userId);
          } else if (
            statusStr === "rejected" ||
            statusStr === "failed" ||
            statusStr === "declined"
          ) {
            const errorMsg =
              myazaData.message ||
              myazaData.error ||
              "Identity verification was rejected";
            await completeKycVerification(auth.userId, {
              verificationId: kycRecord.verificationId,
              status: "failed",
              isCompleted: false,
              rejectionReason: errorMsg,
              rawResponse: myazaData,
            });
            kycRecord = await getOrCreateKycRecord(auth.userId);
          }
        }
      } catch (pollErr: any) {
        // Enforce 1-line logging on background status sync failure, continue safely with cached record
        console.error(
          `[Myaza] warning: ${formatOneLineError(pollErr)}`
        );
      }
    }

    setCachedKycRecord(auth.userId, kycRecord);

    return NextResponse.json(toClientKycDto(kycRecord), { status: 200 });
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Myaza",
      action: "status",
      status: 500,
      rawError: error,
      customMessage: "Unable to retrieve identity verification status at this time.",
    });
  }
}

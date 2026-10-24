import { NextRequest, NextResponse } from "next/server";
import {
  checkMyazaVerificationStatus,
  completeKycVerification,
  getCachedKycRecord,
  getOrCreateKycRecord,
  parseMyazaBiodata,
  resetKycDraft,
  setCachedKycRecord,
  syncKycToUserProfile,
} from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { formatOneLineError, handleExternalApiError } from "@/lib/utils/api-best-practices";

/**
 * Projects a raw database KYC record into a client-safe DTO.
 * Only includes detailed biodata (names, dob, address, id info) if specifically requested via fields=details.
 */
function toClientKycDto(record: any, includeDetails = false) {
  if (!record) {
    return {
      isCompleted: false,
      status: null,
      verificationId: null,
      docMediaId: null,
      selfieMediaId: null,
      rejectionReason: null,
      ...(includeDetails ? { idType: null, idNumber: null, details: null } : {}),
    };
  }

  const isCompleted = Boolean(
    record.isCompleted ||
      record.status === "approved" ||
      record.stage === "completed"
  );

  const baseDto: Record<string, any> = {
    isCompleted,
    status: record.status || null,
    verificationId: record.verificationId || null,
    docMediaId: record.docMediaId || null,
    selfieMediaId: record.selfieMediaId || null,
    rejectionReason: record.rejectionReason || null,
  };

  if (includeDetails) {
    baseDto.idType = record.idType || null;
    baseDto.idNumber = record.idNumber || null;
    baseDto.details = record.details
      ? {
          firstName: record.details.firstName || null,
          middleName: record.details.middleName || null,
          lastName: record.details.lastName || null,
          fullName: record.details.fullName || null,
          dateOfBirth: record.details.dateOfBirth || null,
          gender: record.details.gender || null,
          phone: record.details.phone || null,
          address: record.details.address || null,
          nationality: record.details.nationality || null,
        }
      : null;
  }

  return baseDto;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "low", action: "kyc_status" },
    });
    if (!auth.ok) return auth.response;

    const includeDetails = req.nextUrl.searchParams.get("fields") === "details";
    const bypassCache = req.nextUrl.searchParams.get("refresh") === "true";
    if (!bypassCache) {
      const cached = await getCachedKycRecord(auth.userId);
      if (cached && (cached.isCompleted || cached.status === "approved")) {
        return NextResponse.json(toClientKycDto(cached, includeDetails), { status: 200 });
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
          console.log(
            `[Myaza] Upstream status for verificationId=${kycRecord.verificationId}: ${formatOneLineError(myazaData)}`,
          );
          const statusStr = String(myazaData.status || "").toLowerCase();
          if (
            statusStr === "approved" ||
            statusStr === "verified" ||
            statusStr === "success" ||
            statusStr === "completed" ||
            statusStr === "passed" ||
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

    return NextResponse.json(toClientKycDto(kycRecord, includeDetails), { status: 200 });
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

/**
 * DELETE /api/v1/kyc
 * Clears an in-progress KYC draft (media IDs, ID number, and flow stage)
 * when a user leaves verification to start over from scratch.
 */
export async function DELETE() {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "medium", action: "kyc_reset" },
    });
    if (!auth.ok) return auth.response;

    const cleared = await resetKycDraft(auth.userId);
    return NextResponse.json(
      { success: true, cleared, message: "KYC draft media IDs cleared." },
      { status: 200 },
    );
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Myaza",
      action: "status",
      status: 500,
      rawError: error,
      customMessage: "Unable to clear KYC draft at this time.",
    });
  }
}

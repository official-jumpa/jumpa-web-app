import { NextResponse } from "next/server";
import {
  checkMyazaVerificationStatus,
  completeKycVerification,
  getOrCreateKycRecord,
  parseMyazaBiodata,
  syncKycToUserProfile,
} from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";

export async function GET() {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "low", action: "kyc_status" },
    });
    if (!auth.ok) return auth.response;

    let kycRecord = await getOrCreateKycRecord(auth.userId);

    // If verification is pending and has verificationId, check Myaza for finalized status
    if (
      (kycRecord.status === "pending" || kycRecord.stage === "verifying") &&
      kycRecord.verificationId
    ) {
      try {
        const myazaData = await checkMyazaVerificationStatus(
          kycRecord.verificationId,
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
        console.warn("[KYC API] Status check against Myaza warning:", pollErr.message);
      }
    }

    return NextResponse.json(kycRecord, { status: 200 });
  } catch (error) {
    console.error("[KYC API] Failed to fetch KYC status:", error);
    return NextResponse.json(
      { error: "Internal server error fetching KYC status" },
      { status: 500 },
    );
  }
}


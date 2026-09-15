import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { KycView, type InitialKycData } from "@/components/kyc/kyc-view";

export const metadata: Metadata = {
  title: "Identity Verification",
};

export default async function KycPage() {
  let initialKycData: InitialKycData | null = null;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const record = await getKycRecordByUserId(session.user.id);
      if (record) {
        initialKycData = {
          isCompleted: Boolean(
            record.isCompleted ||
              record.status === "approved" ||
              record.stage === "completed",
          ),
          verificationId: record.verificationId || null,
          docMediaId: record.docMediaId || null,
          selfieMediaId: record.selfieMediaId || null,
          idNumber: record.idNumber || null,
          stepsCompleted: record.stepsCompleted || undefined,
        };
      }
    }
  } catch (err) {
    console.warn("[KycPage SSR]:", err);
  }

  return <KycView initialKycData={initialKycData} />;
}

import { NextResponse } from "next/server";
import { getOrCreateKycRecord } from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const kycRecord = await getOrCreateKycRecord(auth.userId);
    return NextResponse.json(kycRecord, { status: 200 });
  } catch (error) {
    console.error("[KYC API] Failed to fetch KYC status:", error);
    return NextResponse.json(
      { error: "Internal server error fetching KYC status" },
      { status: 500 },
    );
  }
}

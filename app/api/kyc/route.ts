import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateKycRecord } from "@/lib/functions/kycFunctions";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. User must be authenticated." },
        { status: 401 },
      );
    }

    const kycRecord = await getOrCreateKycRecord(session.user.id);
    return NextResponse.json(kycRecord, { status: 200 });
  } catch (error) {
    console.error("[KYC API] Failed to fetch KYC status:", error);
    return NextResponse.json(
      { error: "Internal server error fetching KYC status" },
      { status: 500 },
    );
  }
}

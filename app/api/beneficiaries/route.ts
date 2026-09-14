import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  getUserBeneficiaries,
  deleteBeneficiary,
} from "@/lib/functions/userFunctions";
import type { BeneficiaryType } from "@/models/Beneficiary";

/**
 * GET /api/beneficiaries?type=bank|wallet|jumpa|momo
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as BeneficiaryType | null;

    const beneficiaries = await getUserBeneficiaries(
      userId,
      type || undefined,
    );

    return NextResponse.json({ success: true, beneficiaries });
  } catch (err: any) {
    console.error("[Beneficiaries GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch beneficiaries" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/beneficiaries?id=<beneficiary_id>
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Beneficiary ID is required" },
        { status: 400 },
      );
    }

    const deleted = await deleteBeneficiary(userId, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Beneficiary not found or already deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Beneficiary removed" });
  } catch (err: any) {
    console.error("[Beneficiaries DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete beneficiary" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  getUserBeneficiaries,
  deleteBeneficiary,
} from "@/lib/functions/userFunctions";
import {
  listBeneficiariesQuerySchema,
  deleteBeneficiaryQuerySchema,
} from "@/lib/validations/beneficiary.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/beneficiaries?type=bank|wallet|jumpa|momo
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "beneficiaries_get" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { searchParams } = new URL(req.url);
    const validation = listBeneficiariesQuerySchema.safeParse({
      type: searchParams.get("type") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { type } = validation.data;

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
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "beneficiaries_delete" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { searchParams } = new URL(req.url);
    const validation = deleteBeneficiaryQuerySchema.safeParse({
      id: searchParams.get("id") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { id } = validation.data;

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

import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  getUserBeneficiaries,
  getBeneficiariesAndRecents,
  saveBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "@/lib/functions/userFunctions";
import {
  listBeneficiariesQuerySchema,
  createBeneficiarySchema,
  updateBeneficiarySchema,
  deleteBeneficiaryQuerySchema,
} from "@/lib/validations/beneficiary.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/beneficiaries?type=bank|wallet|jumpa|momo&view=saved|recent|all&limit=10
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
      view: searchParams.get("view") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { type, view = "saved", limit = 10 } = validation.data;

    if (view === "all") {
      const data = await getBeneficiariesAndRecents(userId, type, limit);
      return NextResponse.json({
        success: true,
        data: {
          beneficiaries: data.beneficiaries,
          recents: data.recents,
        },
      });
    }

    const isSaved = view === "saved";
    const beneficiaries = await getUserBeneficiaries(
      userId,
      type,
      isSaved,
      limit,
    );

    return NextResponse.json({
      success: true,
      data: {
        beneficiaries,
      },
    });
  } catch (err: any) {
    console.error(`[Beneficiary] GET error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to fetch beneficiaries" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/beneficiaries
 * Saves or upgrades an account or wallet as an official Beneficiary (isSaved: true).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "beneficiaries_create" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    const validation = createBeneficiarySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const beneficiary = await saveBeneficiary(userId, validation.data);

    console.log(`[Beneficiary] Saved contact "${beneficiary.name}" (${beneficiary.type}) for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        beneficiary,
      },
    });
  } catch (err: any) {
    console.error(`[Beneficiary] POST error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to save beneficiary" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/v1/beneficiaries
 * Updates a saved beneficiary's name or favorite status.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "beneficiaries_update" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    const validation = updateBeneficiarySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { id, name, isFavorite } = validation.data;
    const updated = await updateBeneficiary(userId, id, { name, isFavorite });

    if (!updated) {
      return NextResponse.json(
        { error: "Beneficiary not found or is an automatic recent" },
        { status: 404 },
      );
    }

    console.log(`[Beneficiary] Updated contact "${updated.name}" for user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        beneficiary: updated,
      },
    });
  } catch (err: any) {
    console.error(`[Beneficiary] PATCH error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to update beneficiary" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/beneficiaries?id=<beneficiary_id>
 * Downgrades a saved beneficiary to Recent (Option A).
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
    const downgraded = await deleteBeneficiary(userId, id);

    if (!downgraded) {
      return NextResponse.json(
        { error: "Beneficiary not found or already removed" },
        { status: 404 },
      );
    }

    console.log(`[Beneficiary] Removed saved contact ${id} for user ${userId} (downgraded to recent)`);

    return NextResponse.json({
      success: true,
      data: {
        id,
        message: "Beneficiary removed from saved contacts",
      },
    });
  } catch (err: any) {
    console.error(`[Beneficiary] DELETE error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to remove beneficiary" },
      { status: 500 },
    );
  }
}


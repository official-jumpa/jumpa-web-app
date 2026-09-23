import { type NextRequest, NextResponse } from "next/server";
import { updateKycStage } from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { kycStageSchema } from "@/lib/validations/kyc.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "medium", action: "kyc_stage" },
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const validation = kycStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { stage, currentStep } = validation.data;
    const updated = await updateKycStage(auth.userId, stage, currentStep);

    logUserActivity({
      userId: auth.userId,
      action: "KYC_STAGE_UPDATED",
      details: { stage, currentStep },
      req,
    }).catch((e) => console.error("[KYC API] ActivityLog error:", e));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[KYC API] Failed to update stage:", error);
    return NextResponse.json(
      { error: "Internal server error updating KYC stage" },
      { status: 500 },
    );
  }
}

import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateKycStage } from "@/lib/functions/kycFunctions";
import { kycStageSchema } from "@/lib/validations/kyc.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = kycStageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { stage, currentStep } = validation.data;
    const updated = await updateKycStage(session.user.id, stage, currentStep);

    logUserActivity({
      userId: session.user.id,
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

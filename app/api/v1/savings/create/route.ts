import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { createSavingsPlanSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { createSavingsPlanExecution } from "@/lib/services/savings-execution";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "savings_create" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    const validation = createSavingsPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      kind,
      name,
      category,
      targetAmount,
      depositAmount = 0,
      term,
      frequency,
      fundingSource,
      currency = "USDC",
      circleType,
      circleMembers,
      pin,
    } = validation.data;

    const result = await createSavingsPlanExecution({
      userId,
      pin,
      kind,
      name,
      category,
      targetAmount: targetAmount || depositAmount || 0,
      depositAmount,
      term,
      frequency,
      fundingSource,
      currency,
      circleType,
      circleMembers,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to create savings plan" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      plan: result.plan,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      receiptCardData: result.receiptCardData,
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to create savings plan" },
      { status: 500 },
    );
  }
}

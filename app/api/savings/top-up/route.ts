import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { topUpSavingsSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { depositSavingsExecution } from "@/lib/services/savings-execution";

export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "savings_top_up" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const planId = searchParams.get("id") || body.id || body.planId;

    const validation = topUpSavingsSchema.safeParse({ ...body, planId });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { amount, pin } = validation.data;

    const result = await depositSavingsExecution({
      userId,
      pin,
      planId: validation.data.planId,
      amount,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Top-up failed" },
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
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Failed to process top-up" },
      { status: 500 },
    );
  }
}

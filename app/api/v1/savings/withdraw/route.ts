import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { withdrawSavingsSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { withdrawSavingsExecution } from "@/lib/services/savings-execution";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "savings_withdraw" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const planId = searchParams.get("id") || body.id || body.planId;

    const validation = withdrawSavingsSchema.safeParse({ ...body, planId });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { amount, pin } = validation.data;

    const result = await withdrawSavingsExecution({
      userId,
      pin,
      planId: validation.data.planId,
      amount,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Withdrawal failed" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      plan: result.plan,
      withdrawnAmount: result.withdrawnAmount,
      netPayout: result.netPayout,
      forfeited: result.forfeited,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err?.rawDetail || err)}`);
    return NextResponse.json(
      { error: "Failed to process withdrawal" },
      { status: 500 },
    );
  }
}

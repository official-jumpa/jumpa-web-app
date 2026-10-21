import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { joinCircleExecution } from "@/lib/services/savings-execution";
import { joinCircleSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/savings/join
 * Join an active Circle savings plan with initial contribution.
 */
export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "high", action: "savings_join" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    const validation = joinCircleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { code, amount, pin } = validation.data;

    const result = await joinCircleExecution({
      userId,
      code,
      amount,
      pin,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to join circle" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      plan: result.plan,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to join circle" },
      { status: 500 },
    );
  }
}

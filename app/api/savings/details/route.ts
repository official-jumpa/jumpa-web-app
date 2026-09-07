import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { getRawSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { savingsPlanDetailsQuerySchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  formatPlanForUI,
  getLiveVaultBalance,
  getLiveVaultApy,
} from "@/lib/savings-service";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const validation = savingsPlanDetailsQuerySchema.safeParse({ id });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const plan = await getRawSavingsPlanById(validation.data.id, userId);
    if (!plan) {
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    // Query live on-chain balance & APY from DeFindex vault
    let liveAmount = plan.currentAmount;
    const liveBal = await getLiveVaultBalance(plan.vaultAddress, plan.walletAddress);
    if (liveBal && liveBal.underlyingBalance > 0) {
      liveAmount = liveBal.underlyingBalance;
    }

    const liveApy = await getLiveVaultApy(plan.vaultAddress);
    const formatted = formatPlanForUI(plan, liveAmount);

    return NextResponse.json({
      plan: formatted,
      rawPlan: {
        id: plan._id,
        kind: plan.kind,
        name: plan.name,
        category: plan.category,
        targetAmount: plan.targetAmount,
        currentAmount: liveAmount,
        currency: plan.currency,
        vaultAddress: plan.vaultAddress,
        sharesOwned: liveBal?.shares || plan.sharesOwned,
        startDate: plan.startDate,
        endDate: plan.endDate,
        term: plan.term,
        frequency: plan.frequency,
        debitDay: plan.debitDay,
        fundingSource: plan.fundingSource,
        status: plan.status,
        penaltyFeePercent: plan.penaltyFeePercent,
        txHashes: plan.txHashes,
      },
      liveApy: `${liveApy.toFixed(1)}% p.a.`,
    });
  } catch (err: any) {
    console.error("[GET /api/savings/details] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch plan details" },
      { status: 500 },
    );
  }
});

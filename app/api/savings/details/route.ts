import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { SavingsPlan } from "@/models/SavingsPlan";
import {
  formatPlanForUI,
  getLiveVaultBalance,
  getLiveVaultApy,
} from "@/lib/savings-service";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log("[GET /api/savings/details] Fetching plan details:", { userId, planId: id });

    if (!id) {
      console.warn("[GET /api/savings/details] Missing plan ID in query");
      return NextResponse.json(
        { error: "Plan ID is required in query parameter (?id=...)" },
        { status: 400 },
      );
    }

    const plan = await SavingsPlan.findOne({ _id: id, userId });
    if (!plan) {
      console.warn(`[GET /api/savings/details] Plan ${id} not found for user ${userId}`);
      return NextResponse.json(
        { error: "Savings plan not found" },
        { status: 404 },
      );
    }

    console.log("[GET /api/savings/details] DB plan record found:", {
      id: plan._id,
      name: plan.name,
      kind: plan.kind,
      dbCurrentAmount: plan.currentAmount,
      targetAmount: plan.targetAmount,
      vaultAddress: plan.vaultAddress,
      walletAddress: plan.walletAddress,
      status: plan.status,
    });

    // Query live on-chain balance & APY from DeFindex vault
    let liveAmount = plan.currentAmount;
    const liveBal = await getLiveVaultBalance(plan.vaultAddress, plan.walletAddress);
    if (liveBal && liveBal.underlyingBalance > 0) {
      liveAmount = liveBal.underlyingBalance;
      console.log(`[GET /api/savings/details] Live vault balance fetched: underlying=${liveBal.underlyingBalance} USDC, shares=${liveBal.shares}`);
    } else {
      console.log(`[GET /api/savings/details] Live vault balance returned empty/zero. Falling back to DB currentAmount ($${plan.currentAmount})`);
    }

    const liveApy = await getLiveVaultApy(plan.vaultAddress);
    console.log(`[GET /api/savings/details] Live APY for vault ${plan.vaultAddress}: ${liveApy.toFixed(1)}%`);

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

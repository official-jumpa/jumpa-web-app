import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { listSavingsPlansByUserId } from "@/lib/functions/savingsFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { formatPlanForUI, getLiveVaultApy } from "@/lib/savings-service";
import { environment } from "@/lib/environment";
import type { SavingsKind } from "@/lib/savings";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "individual" | "lock" | "circle" | null
    const validKind =
      type && ["individual", "lock", "circle"].includes(type)
        ? (type as SavingsKind)
        : undefined;

    const [plans, user] = await Promise.all([
      listSavingsPlansByUserId(userId, validKind),
      getUserById(userId),
    ]);

    const hasCreatedSavings = Boolean(user?.hasCreatedSavings || plans.length > 0);
    const seenSavingsIntros = {
      individual: Boolean(user?.seenSavingsIntros?.individual),
      lock: Boolean(user?.seenSavingsIntros?.lock),
      circle: Boolean(user?.seenSavingsIntros?.circle),
    };

    let totalSaved = 0;
    let totalTarget = 0;
    let activeGoalsCount = 0;

    const formattedPlans = plans.map((p) => {
      if (p.status === "Active") {
        totalSaved += p.currentAmount || 0;
        totalTarget += p.targetAmount || 0;
        activeGoalsCount += 1;
      }
      return formatPlanForUI(p);
    });

    const percent =
      totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
    const remaining = Math.max(0, totalTarget - totalSaved);

    // Get live APY for header badge
    const targetVault =
      type === "lock"
        ? environment.DEFINDEX_LOCK_VAULT_ADDRESS
        : environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
    const liveApy = await getLiveVaultApy(targetVault);

    return NextResponse.json({
      plans: formattedPlans,
      hasCreatedSavings,
      seenSavingsIntros,
      summary: {
        goals: activeGoalsCount,
        saved: totalSaved.toLocaleString("en-US", {
          minimumFractionDigits: totalSaved % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        }),
        target: totalTarget.toLocaleString("en-US", {
          minimumFractionDigits: totalTarget % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        }),
        percent,
        remaining: remaining.toLocaleString("en-US", {
          minimumFractionDigits: remaining % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        }),
        apy: `${liveApy.toFixed(1)}% p.a.`,
        apyValue: liveApy,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/savings] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch savings plans" },
      { status: 500 },
    );
  }
});

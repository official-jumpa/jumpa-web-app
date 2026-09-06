import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { SavingsPlan } from "@/models/SavingsPlan";
import { User } from "@/models/User";
import { formatPlanForUI, getLiveVaultApy } from "@/lib/savings-service";
import { environment } from "@/lib/environment";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "individual" | "lock" | null

    console.log("[GET /api/savings] Listing savings plans:", { userId, filterType: type || "all" });

    const query: Record<string, any> = { userId };
    if (type && ["individual", "lock", "circle"].includes(type)) {
      query.kind = type;
    }

    // ‼️OPTIMISE THIS LATER 
    const [plans, user, anyPlan] = await Promise.all([
      SavingsPlan.find(query).sort({ createdAt: -1 }),
      User.findById(userId).select("hasCreatedSavings seenSavingsIntros"),
      SavingsPlan.findOne({ userId }),
    ]);

    const hasCreatedSavings = Boolean(user?.hasCreatedSavings || anyPlan);
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

    console.log("[GET /api/savings] Summary computed:", {
      userId,
      filterType: type || "all",
      plansFound: plans.length,
      activeGoalsCount,
      totalSaved: `$${totalSaved.toFixed(2)}`,
      totalTarget: `$${totalTarget.toFixed(2)}`,
      percent,
      hasCreatedSavings,
      seenSavingsIntros,
      targetVault,
      liveApy: `${liveApy.toFixed(1)}%`,
    });

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

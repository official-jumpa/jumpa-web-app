import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  listSavingsPlansByUserId,
  getSavingsTransactionsByPlanIds,
  getRawSavingsPlanById,
} from "@/lib/functions/savingsFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { listSavingsPlansQuerySchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  getLiveVaultBalance,
  getLiveVaultApy,
} from "@/lib/savings-service";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import type { SavingsKind } from "@/lib/savings";
import type { SavingsGoal, SavingsActivity } from "@/lib/savings-hub";

export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "savings_list" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const { searchParams } = new URL(req.url);

    // Strict query parameter enforcement: reject any unrecognized keys immediately
    const ALLOWED_PARAMS = new Set(["id", "type", "currency", "tab"]);
    for (const key of searchParams.keys()) {
      if (!ALLOWED_PARAMS.has(key)) {
        return NextResponse.json(
          { error: "Invalid request" },
          { status: 400 },
        );
      }
    }

    const validation = listSavingsPlansQuerySchema.safeParse({
      id: searchParams.get("id") || undefined,
      type: searchParams.get("type") || undefined,
      currency: searchParams.get("currency") || undefined,
      tab: searchParams.get("tab") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 },
      );
    }

    if (validation.data.id) {
      const plan = await getRawSavingsPlanById(validation.data.id, userId);
      if (!plan) {
        return NextResponse.json(
          { error: "Savings plan not found" },
          { status: 404 },
        );
      }

      let liveAmount = plan.currentAmount;
      let liveBal: { underlyingBalance: number; shares: string } | null = null;
      if (plan.currency !== "NGN" && plan.vaultAddress && plan.walletAddress) {
        liveBal = await getLiveVaultBalance(plan.vaultAddress, plan.walletAddress);
        if (liveBal && liveBal.underlyingBalance > 0) {
          liveAmount = liveBal.underlyingBalance;
        }
      }

      const liveApy = plan.vaultAddress ? await getLiveVaultApy(plan.vaultAddress) : 0;
      const target = plan.targetAmount || 1;
      const now = new Date();

      let percent = 0;
      if (plan.kind === "lock" && plan.endDate) {
        const startMs = new Date(plan.startDate || (plan as any).createdAt || now).getTime();
        const endMs = new Date(plan.endDate).getTime();
        const totalDuration = endMs - startMs;
        if (totalDuration > 0) {
          const elapsed = Math.max(0, now.getTime() - startMs);
          percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
        }
      } else {
        percent = Math.min(100, Math.round((liveAmount / target) * 100));
      }

      let daysLeft = 0;
      if (plan.endDate) {
        const end = new Date(plan.endDate);
        const diffMs = end.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      let computedStatus = plan.status;
      if (
        computedStatus === "Active" &&
        plan.kind === "lock" &&
        plan.endDate &&
        now.getTime() >= new Date(plan.endDate).getTime()
      ) {
        computedStatus = "Matured";
      }

      return NextResponse.json({
        plan: {
          id: plan._id,
          kind: plan.kind,
          name: plan.name,
          category: plan.category,
          currency: plan.currency,
          targetAmount: plan.targetAmount,
          currentAmount: liveAmount,
          percent,
          daysLeft,
          startDate: plan.startDate,
          endDate: plan.endDate,
          term: plan.term,
          frequency: plan.frequency,
          debitDay: plan.debitDay,
          fundingSource: plan.fundingSource,
          status: computedStatus,
          penaltyFeePercent: plan.penaltyFeePercent,
          vaultAddress: plan.vaultAddress,
          sharesOwned: liveBal?.shares || plan.sharesOwned,
          liveApy: `${liveApy.toFixed(1)}% p.a.`,
          txHashes: plan.txHashes,
        },
      });
    }

    const { type, currency: filterCurrency } = validation.data;

    const [plans, user] = await Promise.all([
      listSavingsPlansByUserId(userId, type),
      getUserById(userId),
    ]);

    const hasCreatedSavings = Boolean(user?.hasCreatedSavings || plans.length > 0);
    const seenSavingsIntros = {
      individual: Boolean(user?.seenSavingsIntros?.individual),
      lock: Boolean(user?.seenSavingsIntros?.lock),
      circle: Boolean(user?.seenSavingsIntros?.circle),
    };

    const now = new Date();

    // Batch fetch transactions for all plans in a single indexed query
    const planIds = plans.map((p) => p._id);
    const txMap = await getSavingsTransactionsByPlanIds(planIds, 30);

    // Map each ISavingsPlan to the lean SavingsGoal DTO (stripping raw DB internals)
    const goals: SavingsGoal[] = plans.map((plan) => {
      const txs = txMap[plan._id] || [];
      const activity: SavingsActivity[] = txs.map((tx) => ({
        id: tx._id,
        kind: tx.kind === "top_up" ? "deposit" : (tx.kind as any),
        amount: tx.amount,
        at: new Date(tx.at || tx.createdAt).toISOString().split("T")[0],
        by: tx.actorName || undefined,
      }));

      const start = new Date(plan.startDate || plan.createdAt || now);
      const startDateFormatted = start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const termDays = plan.term ? parseInt(plan.term, 10) || null : null;
      let daysLeft: number | null = null;
      if (plan.endDate) {
        const diffMs = new Date(plan.endDate).getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      const isClosed = plan.status === "Closed" || plan.status === "Completed";
      const closure =
        isClosed && plan.closure
          ? {
              date: new Date(plan.closure.date || plan.updatedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              paidOut: plan.closure.paidOut,
              forfeited: Boolean(plan.closure.forfeited),
            }
          : isClosed
            ? {
                date: new Date(plan.updatedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
                paidOut: plan.currentAmount || plan.initialDeposit || 0,
                forfeited: false,
              }
            : undefined;

      const circleData =
        plan.kind === "circle"
          ? {
              style: plan.circleConfig?.type || "save_together",
              inviteCode: plan.circleConfig?.inviteCode || plan._id.slice(-6).toUpperCase(),
              capacity: plan.circleConfig?.capacity || 4,
              members: (plan.circleConfig?.members || []).map((m) => ({
                id: m.userId,
                name: m.name,
                you: m.userId === userId,
                owner: m.role === "owner",
                saved: m.saved,
              })),
              reminders: true,
            }
          : undefined;

      return {
        id: plan._id,
        name: plan.name,
        kind: plan.kind as SavingsKind,
        currency: (plan.currency as "NGN" | "USDC") || "USDC",
        saved: plan.currentAmount || 0,
        initialDeposit: plan.initialDeposit || 0,
        target: plan.targetAmount || 0,
        interestEarned: plan.interestEarned || 0,
        termDays,
        daysLeft,
        startDate: startDateFormatted,
        circle: circleData,
        activity,
        apy: plan.apy ?? 0,
        closed: closure,
      };
    });

    // Apply currency filter if specified in request
    const filteredGoals = filterCurrency
      ? goals.filter((g) => g.currency === filterCurrency)
      : goals;

    return NextResponse.json({
      goals: filteredGoals,
      hasCreatedSavings,
      seenSavingsIntros,
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to fetch savings plans" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  listSavingsPlansByUserId,
  getSavingsTransactionsByPlanId,
} from "@/lib/functions/savingsFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { listSavingsPlansQuerySchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { apyForDays, type SavingsKind } from "@/lib/savings";
import type { SavingsGoal, SavingsActivity } from "@/lib/savings-hub";

export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "savings_list" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const validation = listSavingsPlansQuerySchema.safeParse({
      type: searchParams.get("type") || undefined,
      currency: searchParams.get("currency") || undefined,
      tab: searchParams.get("tab") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
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

    // Map each ISavingsPlan to the SavingsGoal structure with its real transactions
    const goals: SavingsGoal[] = await Promise.all(
      plans.map(async (plan) => {
        const txs = await getSavingsTransactionsByPlanId(plan._id, 30);
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
      }),
    );

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
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch savings plans" },
      { status: 500 },
    );
  }
}

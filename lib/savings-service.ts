import { type SavingsPlan as UISavingsPlan, type SavingsKind } from "@/lib/savings";
import { SavingsPlan, type ISavingsPlan } from "@/models/SavingsPlan";
import { connectDB } from "@/lib/db";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { environment } from "@/lib/environment";

const defindexClient = new DefindexClient(
  environment.DEFINDEX_API_KEY,
  environment.DEFINDEX_BASE_URL,
  "testnet",
);

/**
 * Converts a database ISavingsPlan into the UI SavingsPlan model format
 */
export function formatPlanForUI(
  plan: ISavingsPlan,
  liveBalanceOverride?: number,
): UISavingsPlan {
  const currentSaved =
    liveBalanceOverride !== undefined
      ? liveBalanceOverride
      : plan.currentAmount || 0;
  const target = plan.targetAmount || 1;
  const now = new Date();

  let percent = 0;
  if (plan.kind === "lock" && plan.endDate) {
    const startMs = new Date(plan.startDate || plan.createdAt || now).getTime();
    const endMs = new Date(plan.endDate).getTime();
    const totalDuration = endMs - startMs;
    if (totalDuration > 0) {
      const elapsed = Math.max(0, now.getTime() - startMs);
      percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    }
  } else {
    percent = Math.min(
      100,
      Math.round((currentSaved / target) * 100),
    );
  }

  let daysLeft = 0;
  let endDateFormatted = "No deadline";
  let endDateLongFormatted = "No deadline";

  if (plan.endDate) {
    const end = new Date(plan.endDate);
    const diffMs = end.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    endDateFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    endDateLongFormatted = end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const start = new Date(plan.startDate || plan.createdAt || now);
  const startDateFormatted = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const frequencyDisplay =
    plan.frequency === "Daily"
      ? "Daily"
      : `${plan.debitDay || "Every"}, ${plan.frequency}`;

  let computedStatus = plan.status;
  if (
    computedStatus === "Active" &&
    plan.kind === "lock" &&
    plan.endDate &&
    now.getTime() >= new Date(plan.endDate).getTime()
  ) {
    computedStatus = "Matured";
  }

  return {
    id: plan._id,
    kind: plan.kind as SavingsKind,
    name: plan.name,
    endDate: endDateFormatted,
    status: computedStatus,
    saved: `$${currentSaved.toLocaleString("en-US", {
      minimumFractionDigits: currentSaved % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`,
    target: `$${target.toLocaleString("en-US", {
      minimumFractionDigits: target % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`,
    daysLeft,
    percent,
    startDate: startDateFormatted,
    endDateLong: endDateLongFormatted,
    frequency: frequencyDisplay,
  };
}

/**
 * Queries DeFindex live balance for a user's vault position
 */
export async function getLiveVaultBalance(
  vaultAddress: string,
  userAddress: string,
): Promise<{ underlyingBalance: number; shares: string } | null> {
  try {
    const balanceData = await defindexClient.getBalance(
      vaultAddress,
      userAddress,
    );
    const rawStroops = Number(balanceData.underlyingBalance?.[0] ?? 0);
    return {
      underlyingBalance: rawStroops / 10_000_000,
      shares: String(balanceData.dfTokens || "0"),
    };
  } catch (err) {
    console.warn(
      `[SavingsService] Failed to fetch live vault balance for ${userAddress} on ${vaultAddress}:`,
      err,
    );
    return null;
  }
}

/**
 * Queries DeFindex live net APY
 */
export async function getLiveVaultApy(vaultAddress: string): Promise<number> {
  try {
    const apyData = await defindexClient.getApy(vaultAddress);
    return apyData.apy ?? 0;
  } catch (err) {
    console.warn(
      `[SavingsService] Failed to fetch live APY for ${vaultAddress}:`,
      err,
    );
    return 0;
  }
}

/**
 * Loads a plan by ID from the DB.
 */
export async function getPlanById(
  id: string,
  userId: string,
  kind?: SavingsKind,
): Promise<UISavingsPlan | null> {
  try {
    await connectDB();
    const query: Record<string, any> = { _id: id, userId };
    if (kind) query.kind = kind;
    const dbPlan = await SavingsPlan.findOne(query);
    if (dbPlan) {
      return formatPlanForUI(dbPlan);
    }
  } catch (err) {
    console.warn(`[SavingsService] Failed to load plan ${id} from DB:`, err);
  }
  return null;
}

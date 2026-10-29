import { connectDB } from "@/lib/db";
import { SavingsPlan, type ISavingsPlan } from "@/models/SavingsPlan";
import type { SavingsKind } from "@/lib/savings";
import mongoose from "mongoose";

/**
 * Returns the raw Mongoose ISavingsPlan document scoped to the owner or a circle member for mutations.
 */
export async function getRawSavingsPlanById(
  id: string,
  userId: string,
): Promise<(ISavingsPlan & mongoose.Document) | null> {
  await connectDB();
  return SavingsPlan.findOne({
    _id: id,
    $or: [{ userId }, { "circleConfig.members.userId": userId }],
  });
}


/**
 * Lists all active or historical savings plans belonging to or joined by an authenticated user.
 */
export async function listSavingsPlansByUserId(
  userId: string,
  kind?: SavingsKind,
): Promise<ISavingsPlan[]> {
  await connectDB();
  const query: Record<string, any> = {
    $or: [{ userId }, { "circleConfig.members.userId": userId }],
  };
  if (kind) query.kind = kind;
  return SavingsPlan.find(query).sort({ createdAt: -1 }).lean();
}

/**
 * Batches transaction retrieval across multiple savings plans in a single query.
 */
export async function getSavingsTransactionsByPlanIds(
  planIds: string[],
  limitPerPlan = 30,
): Promise<Record<string, ISavingsTransaction[]>> {
  if (!planIds || planIds.length === 0) return {};
  await connectDB();
  const txs = await SavingsTransaction.find({ planId: { $in: planIds } })
    .sort({ at: -1 })
    .lean<ISavingsTransaction[]>();

  const grouped: Record<string, ISavingsTransaction[]> = {};
  for (const tx of txs) {
    if (!grouped[tx.planId]) grouped[tx.planId] = [];
    if (grouped[tx.planId].length < limitPerPlan) {
      grouped[tx.planId].push(tx);
    }
  }
  return grouped;
}

/**
 * Calculates the total active NGN savings principal across all active plans for a user.
 * Used to enforce the platform-wide ₦1,000,000 savings cap per user.
 */
export async function getUserActiveNgnSavings(userId: string): Promise<number> {
  await connectDB();
  const plans = await SavingsPlan.find({
    userId,
    currency: "NGN",
    status: "Active",
  }).select("currentAmount");
  return plans.reduce((sum, p) => sum + (p.currentAmount || 0), 0);
}

/**
 * Calculates the total active USDC savings principal across all active plans for a user.
 * Used to enforce the platform-wide $1,000 USDC savings cap per user.
 */
export async function getUserActiveUsdcSavings(userId: string): Promise<number> {
  await connectDB();
  const plans = await SavingsPlan.find({
    userId,
    currency: "USDC",
    status: "Active",
  }).select("currentAmount");
  return plans.reduce((sum, p) => sum + (p.currentAmount || 0), 0);
}

/**
 * Creates a new savings plan record in the DB.
 */
export async function createSavingsPlanRecord(
  data: Partial<ISavingsPlan>,
  session?: mongoose.ClientSession,
): Promise<ISavingsPlan> {
  await connectDB();
  const [record] = await SavingsPlan.create([data], { session });
  return record;
}

/**
 * Updates a savings plan's current balance, transactions, and status.
 */
export async function updateSavingsPlanBalance(params: {
  planId: string;
  userId: string;
  newAmount: number;
  status?: ISavingsPlan["status"];
}): Promise<ISavingsPlan | null> {
  await connectDB();
  const update: Record<string, any> = {
    $set: {
      currentAmount: params.newAmount,
      ...(params.status ? { status: params.status } : {}),
    },
  };

  return SavingsPlan.findOneAndUpdate(
    { _id: params.planId, userId: params.userId },
    update,
    { returnDocument: "after" },
  );
}

import { SavingsTransaction, type ISavingsTransaction } from "@/models/SavingsTransaction";

/**
 * Inserts a new savings transaction record into the DB.
 */
export async function createSavingsTransaction(
  data: Partial<ISavingsTransaction>,
  session?: mongoose.ClientSession,
): Promise<ISavingsTransaction> {
  await connectDB();
  const [record] = await SavingsTransaction.create([data], { session });
  return record;
}

/**
 * Retrieves the transaction history for a savings plan.
 */
export async function getSavingsTransactionsByPlanId(
  planId: string,
  limit = 50,
): Promise<ISavingsTransaction[]> {
  await connectDB();
  return SavingsTransaction.find({ planId }).sort({ at: -1 }).limit(limit).lean();
}

/**
 * Retrieves all savings transactions for a user across plans.
 */
export async function getSavingsTransactionsByUserId(
  userId: string,
  limit = 50,
): Promise<ISavingsTransaction[]> {
  await connectDB();
  return SavingsTransaction.find({ userId }).sort({ at: -1 }).limit(limit).lean();
}

/**
 * Marks a user's savings plan as Completed or Closed.
 */
export async function closeSavingsPlanRecord(
  planId: string,
  userId: string,
  closure?: { paidOut: number; forfeited: boolean },
): Promise<ISavingsPlan | null> {
  await connectDB();
  return SavingsPlan.findOneAndUpdate(
    { _id: planId, userId },
    {
      $set: {
        status: "Completed",
        currentAmount: 0,
        ...(closure
          ? {
              closure: {
                date: new Date(),
                paidOut: closure.paidOut,
                forfeited: closure.forfeited,
              },
            }
          : {}),
      },
    },
    { returnDocument: "after" },
  );
}

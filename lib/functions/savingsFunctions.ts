import { connectDB } from "@/lib/db";
import { SavingsPlan, type ISavingsPlan } from "@/models/SavingsPlan";
import { formatPlanForUI } from "@/lib/savings-service";
import type { SavingsPlan as UISavingsPlan, SavingsKind } from "@/lib/savings";

/**
 * Loads a user's savings plan by ID from the DB.
 */
export async function getSavingsPlanById(
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
    console.warn(`[SavingsFunctions] Failed to load plan ${id} for user ${userId}:`, err);
  }
  return null;
}

import mongoose from "mongoose";

/**
 * Returns the raw Mongoose ISavingsPlan document scoped to the owner for mutations.
 */
export async function getRawSavingsPlanById(
  id: string,
  userId: string,
): Promise<(ISavingsPlan & mongoose.Document) | null> {
  await connectDB();
  return SavingsPlan.findOne({ _id: id, userId });
}


/**
 * Lists all active or historical savings plans belonging to an authenticated user.
 */
export async function listSavingsPlansByUserId(
  userId: string,
  kind?: SavingsKind,
): Promise<ISavingsPlan[]> {
  await connectDB();
  const query: Record<string, any> = { userId };
  if (kind) query.kind = kind;
  return SavingsPlan.find(query).sort({ createdAt: -1 });
}

/**
 * Creates a new savings plan record in the DB.
 */
export async function createSavingsPlanRecord(
  data: Partial<ISavingsPlan>,
): Promise<ISavingsPlan> {
  await connectDB();
  return SavingsPlan.create(data);
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
    { new: true },
  );
}

/**
 * Marks a user's savings plan as Completed or Closed.
 */
export async function closeSavingsPlanRecord(
  planId: string,
  userId: string,
): Promise<ISavingsPlan | null> {
  await connectDB();
  return SavingsPlan.findOneAndUpdate(
    { _id: planId, userId },
    { $set: { status: "Completed", currentAmount: 0 } },
    { new: true },
  );
}

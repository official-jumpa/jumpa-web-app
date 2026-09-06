import mongoose, { Schema, Model } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type SavingsPlanKind = "individual" | "lock" | "circle";
export type SavingsPlanStatus = "Active" | "Matured" | "Closed";

export interface ISavingsPlan {
  _id: string;
  userId: string;
  walletId?: string;
  walletAddress: string;

  kind: SavingsPlanKind;
  name: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  chain: "stellar";

  vaultAddress: string;
  sharesOwned: string;

  startDate: Date;
  endDate?: Date | null;
  term?: string;
  frequency: string;
  debitDay?: string;
  fundingSource?: string;

  status: SavingsPlanStatus;
  penaltyFeePercent: number;
  txHashes: string[];

  createdAt: Date;
  updatedAt: Date;
}

const SavingsPlanSchema = new Schema<ISavingsPlan>(
  {
    _id: { type: String, default: () => generateId("PLAN") },
    userId: { type: String, required: true, index: true },
    walletId: { type: String, default: null },
    walletAddress: { type: String, required: true },

    kind: {
      type: String,
      enum: ["individual", "lock", "circle"],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    category: { type: String, default: "Other" },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    currency: { type: String, default: "USDC" },
    chain: { type: String, default: "stellar" },

    vaultAddress: { type: String, required: true },
    sharesOwned: { type: String, default: "0" },

    startDate: { type: Date, default: () => new Date() },
    endDate: { type: Date, default: null },
    term: { type: String, default: "30 DAYS" },
    frequency: { type: String, default: "Weekly" },
    debitDay: { type: String, default: null },
    fundingSource: { type: String, default: "crypto" },

    status: {
      type: String,
      enum: ["Active", "Matured", "Closed"],
      default: "Active",
      index: true,
    },
    penaltyFeePercent: { type: Number, default: 5 },
    txHashes: { type: [String], default: [] },
  },
  { timestamps: true, _id: false },
);

SavingsPlanSchema.index({ userId: 1, kind: 1, status: 1 });
SavingsPlanSchema.index({ userId: 1, createdAt: -1 });

export const SavingsPlan: Model<ISavingsPlan> =
  mongoose.models.SavingsPlan ||
  mongoose.model<ISavingsPlan>("SavingsPlan", SavingsPlanSchema);

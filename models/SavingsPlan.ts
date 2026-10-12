import mongoose, { Schema, Model } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type SavingsPlanKind = "individual" | "lock" | "circle";
export type SavingsPlanStatus = "Active" | "Matured" | "Closed" | "Completed" | "Paused";

export interface ISavingsPlanClosure {
  date: Date;
  paidOut: number;
  forfeited: boolean;
}

export type CircleType = "save_together" | "shared_pool";

export interface ICircleMember {
  userId: string;
  name: string;
  role: "owner" | "member";
  saved: number;
  joinedAt: Date;
}

export interface ICircleConfig {
  type: CircleType;
  inviteCode?: string;
  capacity: number;
  members: ICircleMember[];
}

export interface ISavingsPlan {
  _id: string;
  userId: string;
  walletId?: string;
  walletAddress?: string;

  kind: SavingsPlanKind;
  name: string;
  category: string;
  targetAmount: number;
  initialDeposit: number;
  currentAmount: number;
  interestEarned: number;
  lastAccruedDate?: string; // YYYY-MM-DD
  currency: "NGN" | "USDC";
  chain: string; // e.g. stellar | none

  vaultAddress?: string;
  sharesOwned: string;

  circleConfig?: ICircleConfig | null;

  startDate: Date;
  endDate?: Date | null;
  term?: string;
  frequency: string;
  debitDay?: string;
  fundingSource?: string;

  status: SavingsPlanStatus;
  penaltyFeePercent: number;
  txHashes: string[];
  closure?: ISavingsPlanClosure | null;

  createdAt: Date;
  updatedAt: Date;
}

const SavingsPlanSchema = new Schema<ISavingsPlan>(
  {
    _id: { type: String, default: () => generateId("plan") },
    userId: { type: String, required: true, index: true },
    walletId: { type: String, default: null },
    walletAddress: { type: String, default: "" },

    kind: {
      type: String,
      enum: ["individual", "lock", "circle"],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    category: { type: String, default: "Other" },
    targetAmount: { type: Number, required: true },
    initialDeposit: { type: Number, default: 0 },
    currentAmount: { type: Number, default: 0 },
    interestEarned: { type: Number, default: 0 },
    lastAccruedDate: { type: String, default: null },
    currency: { type: String, enum: ["NGN", "USDC"], default: "USDC" },
    chain: { type: String, default: "stellar" },

    vaultAddress: { type: String, default: "" },
    sharesOwned: { type: String, default: "0" },

    circleConfig: {
      type: {
        type: String,
        enum: ["save_together", "shared_pool"],
        default: "save_together",
      },
      inviteCode: { type: String, default: null, index: true },
      capacity: { type: Number, default: 4 },
      members: [
        {
          userId: { type: String, required: true },
          name: { type: String, required: true },
          role: { type: String, enum: ["owner", "member"], default: "member" },
          saved: { type: Number, default: 0 },
          joinedAt: { type: Date, default: () => new Date() },
        },
      ],
    },

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
    penaltyFeePercent: { type: Number, default: 0 },
    txHashes: { type: [String], default: [] },
    closure: {
      date: { type: Date, default: null },
      paidOut: { type: Number, default: null },
      forfeited: { type: Boolean, default: false },
    },
  },
  { timestamps: true, _id: false },
);

SavingsPlanSchema.index({ userId: 1, kind: 1, status: 1 });
SavingsPlanSchema.index({ userId: 1, createdAt: -1 });

export const SavingsPlan: Model<ISavingsPlan> =
  mongoose.models.SavingsPlan ||
  mongoose.model<ISavingsPlan>("SavingsPlan", SavingsPlanSchema);

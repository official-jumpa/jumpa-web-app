import mongoose, { Schema, Model } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type SavingsTransactionKind =
  | "deposit"
  | "top_up"
  | "withdrawal"
  | "interest";

export interface ISavingsTransaction {
  _id: string;
  planId: string;
  userId: string;
  currency: "NGN" | "USDC";
  kind: SavingsTransactionKind;
  amount: number;
  shares?: string;
  txHash?: string;
  forfeited?: boolean;
  actorName?: string;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsTransactionSchema = new Schema<ISavingsTransaction>(
  {
    _id: { type: String, default: () => generateId("savtx") },
    planId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    currency: {
      type: String,
      enum: ["NGN", "USDC"],
      required: true,
      default: "NGN",
    },
    kind: {
      type: String,
      enum: ["deposit", "top_up", "withdrawal", "interest"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    shares: { type: String, default: null },
    txHash: { type: String, default: null },
    forfeited: { type: Boolean, default: false },
    actorName: { type: String, default: null },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, _id: false },
);

SavingsTransactionSchema.index({ planId: 1, at: -1 });
SavingsTransactionSchema.index({ userId: 1, at: -1 });
SavingsTransactionSchema.index({ planId: 1, kind: 1 });

export const SavingsTransaction: Model<ISavingsTransaction> =
  mongoose.models.SavingsTransaction ||
  mongoose.model<ISavingsTransaction>(
    "SavingsTransaction",
    SavingsTransactionSchema,
  );

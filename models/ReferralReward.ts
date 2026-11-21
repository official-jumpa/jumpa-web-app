import type mongoose from "mongoose";
import { model, models, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type ReferralRewardRole = "referrer" | "referred";

/** One reward per referral and side. Unclaimed until moved into the Naira wallet. */
export interface IReferralReward {
  _id: string;
  /** Who earns it. */
  userId: string;
  referralId: string;
  role: ReferralRewardRole;
  /** Whole naira. */
  amount: number;
  /** The claim that paid it out; null while unclaimed. */
  claimId: string | null;
  claimedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralRewardSchema = new Schema<IReferralReward>(
  {
    _id: { type: String, default: () => generateId("rrwd") },
    userId: { type: String, required: true },
    referralId: { type: String, required: true },
    role: { type: String, enum: ["referrer", "referred"], required: true },
    amount: { type: Number, required: true, min: 0 },
    claimId: { type: String, default: null },
    claimedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    _id: false,
    collection: "referral_reward",
  },
);

// Backstop for "each referral pays once".
ReferralRewardSchema.index({ referralId: 1, role: 1 }, { unique: true });
// Balance and claim lookups: a user's unclaimed (claimId null) or claimed rewards.
ReferralRewardSchema.index({ userId: 1, claimId: 1 });

export const ReferralReward =
  (models.ReferralReward as mongoose.Model<IReferralReward>) ??
  model<IReferralReward>("ReferralReward", ReferralRewardSchema);

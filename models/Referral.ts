import type mongoose from "mongoose";
import { model, models, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

/** joined → kyc_verified → rewarded. Rows from before the campaign may stay "joined". */
export const REFERRAL_STATUSES = [
  "joined",
  "kyc_verified",
  "rewarded",
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export interface IReferral {
  _id: string;
  referrerId: string;
  referrerCode: string;
  referredUserId: string;
  /** Legacy flat point; still read by the admin dashboard. */
  points: number;
  status: ReferralStatus;
  kycVerifiedAt?: Date | null;
  /** The ramp transaction that completed the referral. */
  qualifyingTxId?: string | null;
  rewardedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    _id: { type: String, default: () => generateId("refr") },
    referrerId: { type: String, required: true, index: true },
    referrerCode: { type: String, required: true, index: true },
    referredUserId: { type: String, required: true, unique: true, index: true },
    points: { type: Number, default: 1 },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      default: "joined",
    },
    kycVerifiedAt: { type: Date, default: null },
    qualifyingTxId: { type: String, default: null },
    rewardedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    _id: false,
    collection: "referral",
  },
);

ReferralSchema.index({ referrerId: 1, createdAt: -1 });
ReferralSchema.index({ referrerId: 1, status: 1 });
// The sweep walks unrewarded referrals made inside the campaign window.
ReferralSchema.index({ status: 1, createdAt: 1 });

export const Referral =
  (models.Referral as mongoose.Model<IReferral>) ??
  model<IReferral>("Referral", ReferralSchema);

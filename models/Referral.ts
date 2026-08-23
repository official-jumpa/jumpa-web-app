import mongoose, { Schema, model, models } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface IReferral {
  _id: string;
  referrerId: string;
  referrerCode: string;
  referredUserId: string;
  points: number;
  status: "joined" | "active";
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    _id: { type: String, default: () => generateId("REFR") },
    referrerId: { type: String, required: true, index: true },
    referrerCode: { type: String, required: true, index: true },
    referredUserId: { type: String, required: true, unique: true, index: true },
    points: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["joined", "active"],
      default: "joined",
    },
  },
  {
    timestamps: true,
    _id: false,
    collection: "referral",
  },
);

ReferralSchema.index({ referrerId: 1, createdAt: -1 });

export const Referral =
  (models.Referral as mongoose.Model<IReferral>) ??
  model<IReferral>("Referral", ReferralSchema);

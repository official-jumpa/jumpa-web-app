import mongoose, { Schema, model, models } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type WaitlistStatus = "PENDING" | "INVITED" | "ONBOARDED" | "REJECTED";

export interface IWaitlist {
  _id: string;
  email: string;
  name?: string;
  source: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  status: WaitlistStatus;
  referralCode?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  invitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>(
  {
    _id: { type: String, default: () => generateId("wait") },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, trim: true },
    source: { type: String, default: "landing", index: true },
    referrer: { type: String, trim: true, index: true },
    utmSource: { type: String, trim: true },
    utmMedium: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "INVITED", "ONBOARDED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    referralCode: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    invitedAt: { type: Date },
  },
  {
    timestamps: true,
    _id: false,
  },
);

export const Waitlist =
  (models.Waitlist as mongoose.Model<IWaitlist>) ??
  model<IWaitlist>("Waitlist", WaitlistSchema);

import mongoose, { type Model, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type BeneficiaryType = "bank" | "wallet" | "jumpa" | "momo";

export interface IBeneficiaryDetails {
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  country?: string;
  currency?: string;
  routing?: string;
  walletAddress?: string;
  chain?: string;
  network?: string;
  jumpaTag?: string;
  email?: string;
  phone?: string;
}

export interface IBeneficiary {
  _id: string;
  userId: string;
  type: BeneficiaryType;
  name: string;
  identifier: string; // Unique key: e.g. "058:0048392012" or "base:0x..." or "user@jumpa"
  details: IBeneficiaryDetails;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BeneficiarySchema = new Schema<IBeneficiary>(
  {
    _id: {
      type: String,
      default: () => generateId("benef"),
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["bank", "wallet", "jumpa", "momo"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes
BeneficiarySchema.index({ userId: 1, type: 1, identifier: 1 }, { unique: true });
BeneficiarySchema.index({ userId: 1, type: 1, lastUsedAt: -1 });
BeneficiarySchema.index({ userId: 1, lastUsedAt: -1 });

export const Beneficiary: Model<IBeneficiary> =
  mongoose.models.Beneficiary ||
  mongoose.model<IBeneficiary>("Beneficiary", BeneficiarySchema);

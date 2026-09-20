import mongoose, { Schema, model, models } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface INgnAccount {
  _id: string;
  userId: string;
  currency: "NGN" | "USD" | string;
  provider: "importapay" | "fossapay" | string;
  status: "pending" | "active" | "failed";

  // Atomic ledger balance (NGN)
  balance: number;

  // Banking transfer details
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;

  // Provider-agnostic identifiers
  providerCustomerId?: string | null; // e.g. FossaPay customer UUID (legacy)
  providerAccountId?: string | null;  // e.g. ImportaPay DVA ID
  providerReference?: string | null;  // Correlation reference

  // Flexible provider metadata
  providerMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NgnAccountSchema = new Schema<INgnAccount>(
  {
    _id: { type: String, default: () => generateId("ngn") },
    userId: { type: String, required: true, index: true },
    currency: { type: String, required: true, default: "NGN" },
    provider: { type: String, required: true, default: "fossapay" },
    status: {
      type: String,
      enum: ["pending", "active", "failed"],
      default: "active",
    },

    balance: { type: Number, default: 0, min: 0 },

    // Core banking fields
    bankName: { type: String, default: null },
    bankCode: { type: String, default: null },
    accountNumber: { type: String, default: null },
    accountName: { type: String, default: null },

    // Provider tracking IDs
    providerCustomerId: { type: String, default: null },
    providerAccountId: { type: String, default: null },
    providerReference: { type: String, default: null },

    // Provider-specific metadata dictionary
    providerMetadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// One account per currency per provider per user
NgnAccountSchema.index({ userId: 1, currency: 1, provider: 1 }, { unique: true });

// Sparse lookup indexes
NgnAccountSchema.index({ providerCustomerId: 1 }, { sparse: true });
NgnAccountSchema.index({ providerAccountId: 1 }, { sparse: true });
NgnAccountSchema.index({ accountNumber: 1 }, { sparse: true });

export const NgnAccount =
  models.NgnAccount || model<INgnAccount>("NgnAccount", NgnAccountSchema);

// Export alias for future multi-currency / fiat account features
export const FiatAccount = NgnAccount;
export type IFiatAccount = INgnAccount;

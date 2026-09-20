import mongoose, { Schema, Model } from "mongoose";
import { generateBillReference } from "@/lib/schema-ids";

export type BillKind = "AIRTIME" | "DATA";
export type BillStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface IBillPayment {
  _id: string; // Used directly as provider ref_id (alphanumeric)
  userId: string;
  walletAddress: string;

  kind: BillKind;
  phone: string;
  network: "mtn" | "airtel" | "glo" | "9mobile" | string;
  amount: number;

  productName?: string | null;
  packageSize?: string | null;
  validity?: string | null;

  provider: string;
  providerReference?: string | null;
  providerDescription?: string | null;
  providerBalanceAfter?: string | null;

  rawProviderResponse?: any;
  status: BillStatus;
  errorMessage?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const BillPaymentSchema = new Schema<IBillPayment>(
  {
    _id: {
      type: String,
      default: () => generateBillReference(),
    },
    userId: { type: String, required: true, index: true },
    walletAddress: { type: String, required: true },

    kind: {
      type: String,
      enum: ["AIRTIME", "DATA"],
      required: true,
      index: true,
    },
    phone: { type: String, required: true, index: true },
    network: { type: String, required: true },
    amount: { type: Number, required: true },

    productName: { type: String, default: null },
    packageSize: { type: String, default: null },
    validity: { type: String, default: null },

    provider: { type: String, default: "smartsmssolutions" },
    providerReference: { type: String, default: null, index: true },
    providerDescription: { type: String, default: null },
    providerBalanceAfter: { type: String, default: null },
    rawProviderResponse: { type: Schema.Types.Mixed, default: null },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true, _id: false },
);

BillPaymentSchema.index({ userId: 1, createdAt: -1 });
BillPaymentSchema.index({ phone: 1, createdAt: -1 });
BillPaymentSchema.index({ userId: 1, kind: 1, status: 1 });

export const BillPayment: Model<IBillPayment> =
  mongoose.models.BillPayment ||
  mongoose.model<IBillPayment>("BillPayment", BillPaymentSchema);

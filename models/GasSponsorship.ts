import mongoose, { type Model, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

/**
 * TOPPING_UP: gas signed and broadcast, not yet confirmed.
 * OWED: gas landed, its fee not collected yet.
 * COLLECTING: fee transfer broadcast, not yet confirmed.
 * PAID: fee collected. CANCELLED: the gas never landed, so nothing is owed.
 */
export type GasSponsorshipStatus =
  | "TOPPING_UP"
  | "OWED"
  | "COLLECTING"
  | "PAID"
  | "CANCELLED";

/** Gas Jumpa sent a user so their token transfer could go through, and what they pay back for it. */
export interface IGasSponsorship {
  _id: string;
  userId: string;
  chain: "tron";
  /** The user's address on that chain. */
  address: string;
  topUpTxHash: string;
  /** TRX sent to the user, in sun. */
  topUpSun: number;
  /** Everything Jumpa spent: the top-up plus what sending it burned (activation, bandwidth). */
  costSun: number;
  /** The fee owed, in the stablecoin's 6-decimal units (USDT and USDC both). */
  feeRaw: number;
  feeTxHash: string | null;
  /** The user's own transfer that the gas paid for. */
  transferTxHash: string | null;
  status: GasSponsorshipStatus;
  /** Set until PAID or CANCELLED; the unique index below allows one open record per user. */
  open?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GasSponsorshipSchema = new Schema<IGasSponsorship>(
  {
    _id: { type: String, default: () => generateId("gas") },
    userId: { type: String, required: true },
    chain: { type: String, enum: ["tron"], required: true },
    address: { type: String, required: true },
    topUpTxHash: { type: String, required: true, unique: true },
    topUpSun: { type: Number, required: true },
    costSun: { type: Number, required: true },
    feeRaw: { type: Number, required: true },
    feeTxHash: { type: String, default: null },
    transferTxHash: { type: String, default: null },
    status: {
      type: String,
      enum: ["TOPPING_UP", "OWED", "COLLECTING", "PAID", "CANCELLED"],
      required: true,
    },
    open: { type: Boolean },
  },
  { timestamps: true, _id: false, collection: "gas_sponsorships" },
);

GasSponsorshipSchema.index({ userId: 1, chain: 1, status: 1 });
// One unsettled sponsorship per user, so two sends at once can't both get gas.
GasSponsorshipSchema.index(
  { userId: 1, chain: 1 },
  { unique: true, partialFilterExpression: { open: true } },
);

export const GasSponsorship: Model<IGasSponsorship> =
  mongoose.models.GasSponsorship ||
  mongoose.model<IGasSponsorship>("GasSponsorship", GasSponsorshipSchema);

import mongoose, { type Model, Schema } from "mongoose";
import type {
  NimiqDirection,
  NimiqOrderStatus,
} from "@/lib/nimiq/order-status";
import { generateId } from "@/lib/schema-ids";

export type NimiqOrderBank = {
  name: string;
  code: string;
  accountNumber: string;
  accountName: string;
};

export type NimiqDepositBank = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  notes: string[];
};

export type NimiqOrderBill = {
  /** Normalised to 11 digits. */
  phone: string;
  network: string;
  /** Data only: SmartSMS's product name, which is what it sells by. */
  productName?: string;
  size?: string;
  validity?: string;
};

export type NimiqOrderPermit = {
  spender: string;
  nonce: string;
  /** Unix seconds. */
  deadline: number;
};

/** A Nimiq Pay mini-app cash-out, top-up, bill or send; the wallet address is the only identity. */
export interface INimiqOrder {
  _id: string;
  direction: NimiqDirection;
  walletAddress: string;
  /** Top-up: the checksummed wallet paid when it isn't `walletAddress`. Send: the recipient. */
  recipientAddress?: string;
  status: NimiqOrderStatus;
  amountUsd: number;
  /** USDT base units (6 decimals) as a decimal string. */
  cryptoUnits: string;
  cryptoAmount: string;
  fiatAmount: number;
  rate: number;
  /** Switch's reference; for a bill, the `ref_id` sent to SmartSMS. */
  switchReference: string;
  /** Where the permit moves the USDT: Switch's deposit, the relayer for a bill, the recipient for a send. */
  depositAddress?: string;
  bank?: NimiqOrderBank;
  depositBank?: NimiqDepositBank;
  permit?: NimiqOrderPermit;
  bill?: NimiqOrderBill;
  /** SmartSMS's id for a delivered bill. */
  providerReference?: string;
  /** Set once, before SmartSMS is called; a bill is never bought twice. */
  buyStartedAt?: Date;
  refundTxHash?: string;
  refundNonce?: number;
  /** Claimed before a refund is sent, so two polls never refund twice. */
  refundStartedAt?: Date;
  permitTxHash?: string;
  transferTxHash?: string;
  /** The relayer nonce the transfer was signed with; settles a transfer that never mines. */
  transferNonce?: number;
  /** When the signature was claimed for relaying; polls never move it. */
  relayStartedAt?: Date;
  failureReason?: string;
  /** Last signature or bank-transfer moment Switch will accept. */
  expiresAt?: Date;
  /** Last time Switch or the chain was asked about this order; throttles polling. */
  checkedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NimiqOrderSchema = new Schema<INimiqOrder>(
  {
    _id: { type: String, default: () => generateId("nimq") },
    direction: {
      type: String,
      enum: ["cash_out", "top_up", "airtime", "data", "send"],
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientAddress: String,
    status: {
      type: String,
      enum: [
        "awaiting_signature",
        "relaying",
        "awaiting_deposit",
        "processing",
        "completed",
        "failed",
        "expired",
        "refunding",
        "refunded",
      ],
      required: true,
    },
    amountUsd: { type: Number, required: true },
    cryptoUnits: { type: String, required: true },
    cryptoAmount: { type: String, required: true },
    fiatAmount: { type: Number, required: true },
    rate: { type: Number, required: true },
    switchReference: { type: String, required: true, unique: true },
    depositAddress: String,
    bank: {
      type: new Schema<NimiqOrderBank>(
        {
          name: String,
          code: String,
          accountNumber: String,
          accountName: String,
        },
        { _id: false },
      ),
      default: undefined,
    },
    depositBank: {
      type: new Schema<NimiqDepositBank>(
        {
          bankName: String,
          accountName: String,
          accountNumber: String,
          notes: [String],
        },
        { _id: false },
      ),
      default: undefined,
    },
    permit: {
      type: new Schema<NimiqOrderPermit>(
        { spender: String, nonce: String, deadline: Number },
        { _id: false },
      ),
      default: undefined,
    },
    bill: {
      type: new Schema<NimiqOrderBill>(
        {
          phone: String,
          network: String,
          productName: String,
          size: String,
          validity: String,
        },
        { _id: false },
      ),
      default: undefined,
    },
    providerReference: String,
    buyStartedAt: Date,
    refundTxHash: String,
    refundNonce: Number,
    refundStartedAt: Date,
    permitTxHash: String,
    transferTxHash: String,
    transferNonce: Number,
    relayStartedAt: Date,
    failureReason: String,
    expiresAt: Date,
    checkedAt: Date,
  },
  { timestamps: true, collection: "nimiq_orders" },
);

NimiqOrderSchema.index({ walletAddress: 1, createdAt: -1 });

export const NimiqOrder: Model<INimiqOrder> =
  mongoose.models.NimiqOrder ||
  mongoose.model<INimiqOrder>("NimiqOrder", NimiqOrderSchema);

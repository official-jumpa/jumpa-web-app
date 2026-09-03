import mongoose, { Schema, Model } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface ITransaction {
  _id: string;
  userId: string;
  walletId?: string;
  sessionId?: string;
  messageId?: string;

  type: "TRANSFER" | "SWAP" | "ONRAMP" | "OFFRAMP" | "FAUCET";
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED";

  chain: "stellar" | "solana" | "base" | "eth" | "btc";
  network: "mainnet" | "testnet";

  // Transfer & Faucet Details
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  memo?: string;

  // Swap Details (if type === "SWAP")
  swapDetails?: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    slippage?: number;
    protocol?: string;
  };

  // Fiat Ramp Details (if type === "ONRAMP" | "OFFRAMP")
  rampDetails?: {
    provider: "switch" | "moneygram" | "mercuryo";
    fiatCurrency: string;
    fiatAmount: number;
    reference?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      bankCode?: string;
    };
  };

  // On-Chain Execution & Accounting
  txHash?: string;
  explorerUrl?: string;
  feePaid?: string;
  errorMessage?: string;
  executedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    _id: { type: String, default: () => generateId("TX") },
    userId: { type: String, required: true, index: true },
    walletId: { type: String, default: null },
    sessionId: { type: String, default: null },
    messageId: { type: String, default: null },

    type: {
      type: String,
      enum: ["TRANSFER", "SWAP", "ONRAMP", "OFFRAMP", "FAUCET"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED", "CANCELLED"],
      default: "PENDING",
      required: true,
    },

    chain: {
      type: String,
      enum: ["stellar", "solana", "base", "eth", "btc"],
      default: "stellar",
    },
    network: {
      type: String,
      enum: ["mainnet", "testnet"],
      default: "testnet",
    },

    fromAddress: { type: String, required: true },
    toAddress: { type: String, required: true },
    amount: { type: String, required: true },
    token: { type: String, required: true },
    memo: { type: String, default: null },

    swapDetails: {
      fromToken: { type: String },
      toToken: { type: String },
      fromAmount: { type: String },
      toAmount: { type: String },
      slippage: { type: Number },
      protocol: { type: String },
    },

    rampDetails: {
      provider: { type: String },
      fiatCurrency: { type: String },
      fiatAmount: { type: Number },
      reference: { type: String },
      bankDetails: {
        bankName: { type: String },
        accountNumber: { type: String },
        accountName: { type: String },
        bankCode: { type: String },
      },
    },

    txHash: { type: String, default: null, index: true },
    explorerUrl: { type: String, default: null },
    feePaid: { type: String, default: null },
    errorMessage: { type: String, default: null },
    executedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false },
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, type: 1, status: 1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

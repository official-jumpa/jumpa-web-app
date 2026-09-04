import mongoose, { Schema, model, models } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface IWallet {
  _id: string;
  userId: string | null;
  name: string;
  address: string;
  addresses: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
  };
  publicKeys: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
  };
  encryptedMnemonic: string;
  iv: string;
  salt: string;
  pinHash: string;
  pinAttempts: number;
  pinLockedUntil: Date | null;
  setupMethod?: "CREATED_SEED" | "IMPORTED_SEED" | "IMPORTED_PRIVATE_KEY";
  importedChain?: string | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    _id: { type: String, default: () => generateId("WALL") },
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, default: "Wallet" },
    address: { type: String, required: true, unique: true, lowercase: true },
    addresses: {
      eth: { type: String, required: true },
      sol: { type: String, required: true },
      base: { type: String, required: true },
      xlm: { type: String, required: true },
    },
    publicKeys: {
      eth: { type: String, required: true },
      sol: { type: String, required: true },
      base: { type: String, required: true },
      xlm: { type: String, required: true },
    },
    encryptedMnemonic: { type: String, required: true },
    iv: { type: String, required: true },
    salt: { type: String, required: true },
    pinHash: { type: String, required: true },
    pinAttempts: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    setupMethod: {
      type: String,
      enum: ["CREATED_SEED", "IMPORTED_SEED", "IMPORTED_PRIVATE_KEY"],
      default: "CREATED_SEED",
    },
    importedChain: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false },
);

WalletSchema.index({ "addresses.eth": 1 });
WalletSchema.index({ "addresses.base": 1 });
WalletSchema.index({ "addresses.sol": 1 });

export const Wallet =
  (models.Wallet as mongoose.Model<IWallet>) ??
  model<IWallet>("Wallet", WalletSchema);

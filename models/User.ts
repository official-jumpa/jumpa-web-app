import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string;
  name: string | null;
  status: "pending" | "active" | "banned" | "suspended" | "deleted";
  country: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  jumpaTag?: string | null;
  loginPasswordHash?: string | null;
  referralCode?: string | null;
  referredBy?: string | null;
  lastLoginAt?: Date | null;
  loginMethod?: "google" | "email" | "anonymous";
  activeWalletId?: string | null;
  hasCreatedSavings?: boolean;
  seenSavingsIntros?: {
    individual?: boolean;
    lock?: boolean;
    circle?: boolean;
  };
  preferenceId?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, default: null },
    status: { type: String, default: "active" },
    country: { type: String, default: null },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, required: true, default: false },
    image: { type: String, default: null },
    jumpaTag: {
      type: String,
      lowercase: true,
      index: {
        unique: true,
        partialFilterExpression: { jumpaTag: { $type: "string" } },
      },
    },
    loginPasswordHash: { type: String, default: null },
    referralCode: {
      type: String,
      lowercase: true,
      index: {
        unique: true,
        partialFilterExpression: { referralCode: { $type: "string" } },
      },
    },
    referredBy: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    loginMethod: { type: String, enum: ["google", "email", "anonymous"], default: "email" },
    activeWalletId: { type: String, default: null },
    hasCreatedSavings: { type: Boolean, default: false },
    seenSavingsIntros: {
      individual: { type: Boolean, default: false },
      lock: { type: Boolean, default: false },
      circle: { type: Boolean, default: false },
    },
    preferenceId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    _id: false, // Prevent mongoose from auto-generating id
    collection: "user", // match MongoDB collection name for Better-Auth
  },
);

export const User =
  (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);

import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string; // Better-Auth uses custom generated string IDs (e.g. user_...)
  name: string | null;
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, default: null },
    country: { type: String, default: null },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, required: true, default: false },
    image: { type: String, default: null },
    jumpaTag: { type: String, unique: true, sparse: true, lowercase: true },
    loginPasswordHash: { type: String, default: null },
    referralCode: { type: String, unique: true, sparse: true, lowercase: true },
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
  },
  {
    timestamps: true,
    _id: false, // Prevent mongoose from auto-generating id
    collection: "user", // match MongoDB collection name for Better-Auth
  },
);

export const User =
  (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);

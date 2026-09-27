import mongoose, { type Model, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export const USER_ACTIVITY_ACTIONS = [
  // Auth & Session
  "USER_LOGIN",
  "USER_LOGOUT",
  "SESSION_REVOKED",
  "ALL_OTHER_SESSIONS_REVOKED",
  "ACCOUNT_DELETED",
  // Security & Onboarding
  "LOGIN_PASSWORD_SET",
  "JUMPA_TAG_SET",
  "WALLET_CREATED",
  "WALLET_IMPORTED",
  "PIN_VERIFIED",
  "PIN_FAILED",
  "PIN_LOCKED",
  "PIN_CHANGED",
  "PIN_MIGRATED",
  "PRIVATE_KEY_EXPORTED",
  "SEED_PHRASE_EXPORTED",
  "PHONE_NUMBER_VERIFIED",
  "PHONE_NUMBER_SKIPPED",
  "LOGIN_PASSWORD_VERIFIED",
  "APP_AUTO_LOCKED",
  // Financial Transactions
  "TRANSFER_SENT",
  "TRANSFER_RECEIVED",
  "FAUCET_REQUESTED",
  "SWAP_EXECUTED",
  "BRIDGE_INITIATED",
  "BRIDGE_EXECUTED",
  "BRIDGE_COMPLETED",
  "ONRAMP_INITIATED",
  "ONRAMP_COMPLETED",
  "OFFRAMP_INITIATED",
  "OFFRAMP_COMPLETED",
  // Savings
  "SAVINGS_PLAN_CREATED",
  "SAVINGS_TOP_UP",
  "SAVINGS_WITHDRAWAL",
  // Fiat / Naira Transactions
  "DEPOSIT_INITIATED",
  "DEPOSIT_COMPLETED",
  "WITHDRAWAL_INITIATED",
  "WITHDRAWAL_COMPLETED",
  // Identity & KYC
  "KYC_STAGE_UPDATED",
  "KYC_SUBMITTED",
  "KYC_DOCUMENT_UPLOADED",
  // Bills & Utilities
  "AIRTIME_PURCHASED",
  "DATA_PURCHASED",
  // Beneficiaries & Contacts
  "BENEFICIARY_ADDED",
  "BENEFICIARY_DELETED",
  // Chat & AI Interactions
  "CHAT_TRANSACTION_CONFIRMED",
  "CHAT_TRANSACTION_CANCELLED",
  // Profile & Settings
  "PROFILE_UPDATED",
  "PREFERENCE_UPDATED",
] as const;

export type UserActivityAction = (typeof USER_ACTIVITY_ACTIONS)[number];

export interface IUserActivityLog {
  _id: string;
  userId: string;
  action: UserActivityAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const UserActivityLogSchema = new Schema<IUserActivityLog>(
  {
    _id: { type: String, default: () => generateId("act") },
    userId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: USER_ACTIVITY_ACTIONS,
      required: true,
    },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
);

UserActivityLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

export const UserActivityLog: Model<IUserActivityLog> =
  mongoose.models.UserActivityLog ||
  mongoose.model<IUserActivityLog>("UserActivityLog", UserActivityLogSchema);

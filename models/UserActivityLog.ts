import mongoose, { type Model, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type UserActivityAction =
  // Auth & Session
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "SESSION_REVOKED"
  | "ALL_OTHER_SESSIONS_REVOKED"
  | "ACCOUNT_DELETED"
  // Security & Onboarding
  | "LOGIN_PASSWORD_SET"
  | "JUMPA_TAG_SET"
  | "WALLET_CREATED"
  | "WALLET_IMPORTED"
  | "PIN_VERIFIED"
  | "PIN_FAILED"
  | "PIN_LOCKED"
  | "PIN_CHANGED"
  | "PIN_MIGRATED"
  | "PRIVATE_KEY_EXPORTED"
  | "SEED_PHRASE_EXPORTED"
  | "PHONE_NUMBER_VERIFIED"
  | "PHONE_NUMBER_SKIPPED"
  // Financial Transactions
  | "TRANSFER_SENT"
  | "TRANSFER_RECEIVED"
  | "FAUCET_REQUESTED"
  | "SWAP_EXECUTED"
  | "ONRAMP_INITIATED"
  | "ONRAMP_COMPLETED"
  | "OFFRAMP_INITIATED"
  | "OFFRAMP_COMPLETED"
  // Savings
  | "SAVINGS_PLAN_CREATED"
  | "SAVINGS_TOP_UP"
  | "SAVINGS_WITHDRAWAL"
  // Fiat / Naira Transactions
  | "DEPOSIT_INITIATED"
  | "DEPOSIT_COMPLETED"
  | "WITHDRAWAL_INITIATED"
  | "WITHDRAWAL_COMPLETED"
  // Identity & KYC
  | "KYC_STAGE_UPDATED"
  | "KYC_SUBMITTED"
  | "KYC_DOCUMENT_UPLOADED"
  // Bills & Utilities
  | "AIRTIME_PURCHASED"
  | "DATA_PURCHASED"
  // Beneficiaries & Contacts
  | "BENEFICIARY_ADDED"
  | "BENEFICIARY_DELETED"
  // Chat & AI Interactions
  | "CHAT_TRANSACTION_CONFIRMED"
  | "CHAT_TRANSACTION_CANCELLED"
  // Profile & Settings
  | "PROFILE_UPDATED"
  | "PREFERENCE_UPDATED";

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
      enum: [
        "USER_LOGIN",
        "USER_LOGOUT",
        "SESSION_REVOKED",
        "ALL_OTHER_SESSIONS_REVOKED",
        "ACCOUNT_DELETED",
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
        "TRANSFER_SENT",
        "TRANSFER_RECEIVED",
        "FAUCET_REQUESTED",
        "SWAP_EXECUTED",
        "ONRAMP_INITIATED",
        "ONRAMP_COMPLETED",
        "OFFRAMP_INITIATED",
        "OFFRAMP_COMPLETED",
        "SAVINGS_PLAN_CREATED",
        "SAVINGS_TOP_UP",
        "SAVINGS_WITHDRAWAL",
        "DEPOSIT_INITIATED",
        "DEPOSIT_COMPLETED",
        "WITHDRAWAL_INITIATED",
        "WITHDRAWAL_COMPLETED",
        "KYC_STAGE_UPDATED",
        "KYC_SUBMITTED",
        "KYC_DOCUMENT_UPLOADED",
        "AIRTIME_PURCHASED",
        "DATA_PURCHASED",
        "BENEFICIARY_ADDED",
        "BENEFICIARY_DELETED",
        "CHAT_TRANSACTION_CONFIRMED",
        "CHAT_TRANSACTION_CANCELLED",
        "PROFILE_UPDATED",
        "PREFERENCE_UPDATED",
      ],
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

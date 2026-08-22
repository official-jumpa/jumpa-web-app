import mongoose, { Schema, Model } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface IUserActivityLog {
  _id: string;
  userId: string;
  action:
    | "USER_LOGIN"
    | "WALLET_CREATED"
    | "WALLET_IMPORTED"
    | "PIN_VERIFIED"
    | "PIN_FAILED"
    | "PIN_LOCKED"
    | "FAUCET_REQUESTED"
    | "ONRAMP_INITIATED"
    | "OFFRAMP_INITIATED";
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const UserActivityLogSchema = new Schema<IUserActivityLog>(
  {
    _id: { type: String, default: () => generateId("ACT") },
    userId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        "USER_LOGIN",
        "WALLET_CREATED",
        "WALLET_IMPORTED",
        "PIN_VERIFIED",
        "PIN_FAILED",
        "PIN_LOCKED",
        "FAUCET_REQUESTED",
        "ONRAMP_INITIATED",
        "OFFRAMP_INITIATED",
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

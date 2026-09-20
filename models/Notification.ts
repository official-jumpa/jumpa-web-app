import mongoose, { type Model, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type NotificationTab = "transactions" | "activities";

export type NotificationType =
  | "FUNDS_RECEIVED"
  | "TRANSFER_SENT"
  | "ONRAMP_INITIATED"
  | "ONRAMP_COMPLETED"
  | "OFFRAMP_INITIATED"
  | "OFFRAMP_COMPLETED"
  | "DEPOSIT_COMPLETED"
  | "SWAP_COMPLETED"
  | "FAUCET_CLAIMED"
  | "LOGIN"
  | "PIN_CHANGED"
  | "PIN_MIGRATED"
  | "JUMPA_TAG_SET"
  | "WALLET_CREATED"
  | "WALLET_IMPORTED"
  | "SECURITY_ALERT";

export interface INotification {
  _id: string;
  userId: string;
  tab: NotificationTab;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, any>;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: () => generateId("notif") },
    userId: { type: String, required: true, index: true },
    tab: {
      type: String,
      enum: ["transactions", "activities"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
    link: { type: String, default: null },
  },
  { timestamps: true, _id: false },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, tab: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

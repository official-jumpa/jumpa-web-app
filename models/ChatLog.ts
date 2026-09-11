import mongoose, { type Model, Schema } from "mongoose";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { generateId } from "@/lib/schema-ids";

export interface IChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTransaction?: boolean;
  cardType?:
    | "quote"
    | "bridge"
    | "transfer"
    | "receipt"
    | "onramp"
    | "offramp"
    | "options"
    | "plans"
    | "contacts"
    | "accounts"
    | "sep24"
    | "text";
  cardData?: Record<string, any>;
  status?: "pending" | "confirmed" | "cancelled";
  transactionParams?: Record<string, any>;
  transactionDetails?: {
    title?: string;
    label?: string;
    sent?: string;
    to?: string;
    result?: string;
    isScheduled?: boolean;
  };
  imageUrls?: string[];
  /** Files the user sent with the message, stored in GridFS. */
  attachments?: ChatAttachment[];
  isVoice?: boolean;
}

export interface IChatLog {
  _id: string;
  userId: string;
  walletAddress?: string;
  type: "personal" | "group";
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatLogSchema = new Schema<IChatLog>(
  {
    _id: { type: String, default: () => generateId("chat") },
    userId: { type: String, required: true, index: true },
    walletAddress: { type: String, default: "", index: true },
    type: { type: String, enum: ["personal", "group"], default: "personal" },
    title: { type: String, default: "New Chat" },
    messages: [
      {
        id: { type: String, default: () => generateId("msg") },
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        isTransaction: { type: Boolean, default: false },
        cardType: {
          type: String,
          enum: [
            "quote",
            "bridge",
            "transfer",
            "receipt",
            "onramp",
            "offramp",
            "options",
            "plans",
            "contacts",
            "accounts",
            "sep24",
            "text",
          ],
          default: "text",
        },
        cardData: { type: Schema.Types.Mixed },
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled"],
          default: "pending",
        },
        transactionParams: { type: Schema.Types.Mixed },
        transactionDetails: {
          title: { type: String },
          label: { type: String },
          sent: { type: String },
          to: { type: String },
          result: { type: String },
          isScheduled: { type: Boolean },
        },
        imageUrls: [{ type: String }],
        attachments: [
          {
            _id: false,
            id: { type: String, required: true },
            url: { type: String, required: true },
            name: { type: String, default: "attachment" },
            mime: { type: String, default: "application/octet-stream" },
            size: { type: Number, default: 0 },
          },
        ],
        isVoice: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true, _id: false },
);

ChatLogSchema.index({ userId: 1, type: 1, updatedAt: -1 });

export const ChatLog: Model<IChatLog> =
  mongoose.models.ChatLog || mongoose.model<IChatLog>("ChatLog", ChatLogSchema);

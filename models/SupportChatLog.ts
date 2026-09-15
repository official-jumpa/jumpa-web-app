import mongoose, { type Model, Schema } from "mongoose";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { generateId } from "@/lib/schema-ids";

export interface ISupportChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  timestamp: Date;
}

export interface ISupportChatLog {
  _id: string;
  userId: string;
  status: "open" | "resolved" | "closed";
  messages: ISupportChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportChatLogSchema = new Schema<ISupportChatLog>(
  {
    _id: { type: String, default: () => generateId("supt") },
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "resolved", "closed"],
      default: "open",
      index: true,
    },
    messages: [
      {
        _id: false,
        id: { type: String, required: true },
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
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
      },
    ],
  },
  {
    timestamps: true,
    _id: false,
  },
);

SupportChatLogSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const SupportChatLog: Model<ISupportChatLog> =
  mongoose.models.SupportChatLog ||
  mongoose.model<ISupportChatLog>("SupportChatLog", SupportChatLogSchema);

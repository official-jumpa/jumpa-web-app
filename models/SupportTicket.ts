import mongoose, { type Model, Schema } from "mongoose";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { generateId } from "@/lib/schema-ids";
import {
  HANDOFF_TEAMS,
  type HandoffTeam,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketTransaction,
} from "@/lib/support-tickets";

/** `note` is staff-only and is filtered out of everything the user is sent. */
export type SupportMessageRole =
  | "user"
  | "assistant"
  | "agent"
  | "system"
  | "note";

export interface ISupportMessage {
  id: string;
  role: SupportMessageRole;
  content: string;
  attachments?: ChatAttachment[];
  agentEmail?: string;
  agentName?: string;
  transaction?: TicketTransaction;
  timestamp: Date;
}

export interface SupportAgent {
  email: string;
  name: string;
}

export interface ISupportTicket {
  _id: string;
  userId: string;
  /** "JMP-4K2P9Q"-style, quoted in emails and on the phone. */
  ref: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority;
  /** Why it was escalated: the trigger, or the assistant's own reason. */
  reason: string | null;
  aiSummary: string | null;
  transactionIds: string[];
  handoffTeam: HandoffTeam | null;
  escalatedAt: Date | null;
  /** When the team is pinged again if nobody has claimed it. */
  claimDueAt: Date | null;
  claimAlertedAt: Date | null;
  claimedBy: SupportAgent | null;
  claimedAt: Date | null;
  slaDueAt: Date | null;
  slaBreachedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  lastUserMessageAt: Date | null;
  /** Agent replies and staff system lines; drives the unread dot. */
  lastAgentMessageAt: Date | null;
  /** Last time the user had the thread open. */
  userSeenAt: Date | null;
  replyEmailedAt: Date | null;
  rating: { score: number; comment?: string; at: Date } | null;
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ChatAttachment>(
  {
    id: { type: String, default: () => generateId("att"), required: true },
    url: { type: String, required: true },
    name: { type: String, default: "attachment" },
    mime: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
  },
  { _id: false },
);

const messageSchema = new Schema<ISupportMessage>(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "assistant", "agent", "system", "note"],
      required: true,
    },
    // Empty when the message is only a shared transaction or an attachment.
    content: { type: String, default: "" },
    attachments: [attachmentSchema],
    agentEmail: { type: String },
    agentName: { type: String },
    transaction: {
      type: new Schema(
        {
          id: String,
          kind: String,
          title: String,
          amount: String,
          status: String,
          createdAt: Number,
        },
        { _id: false },
      ),
      default: undefined,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const agentSchema = new Schema<SupportAgent>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    _id: { type: String, default: () => generateId("supt") },
    userId: { type: String, required: true, index: true },
    // No default: a sparse index skips missing fields but indexes null.
    ref: { type: String },
    subject: { type: String, default: "" },
    status: { type: String, enum: TICKET_STATUSES, default: "ai" },
    category: { type: String, enum: TICKET_CATEGORIES, default: null },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "normal" },
    reason: { type: String, default: null },
    aiSummary: { type: String, default: null },
    transactionIds: { type: [String], default: [] },
    handoffTeam: { type: String, enum: HANDOFF_TEAMS, default: null },
    escalatedAt: { type: Date, default: null },
    claimDueAt: { type: Date, default: null },
    claimAlertedAt: { type: Date, default: null },
    claimedBy: { type: agentSchema, default: null },
    claimedAt: { type: Date, default: null },
    slaDueAt: { type: Date, default: null },
    slaBreachedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    lastUserMessageAt: { type: Date, default: null },
    lastAgentMessageAt: { type: Date, default: null },
    userSeenAt: { type: Date, default: null },
    replyEmailedAt: { type: Date, default: null },
    rating: {
      type: new Schema(
        { score: Number, comment: String, at: Date },
        { _id: false },
      ),
      default: null,
    },
    messages: [messageSchema],
  },
  { timestamps: true, _id: false },
);

// "high" sorts before "normal" ascending, so the queue reads urgent-first, oldest-first.
SupportTicketSchema.index({ status: 1, priority: 1, escalatedAt: 1 });
SupportTicketSchema.index({ userId: 1, updatedAt: -1 });
SupportTicketSchema.index({ slaDueAt: 1 }, { sparse: true });
SupportTicketSchema.index({ ref: 1 }, { unique: true, sparse: true });

/** Keeps the old `supportchatlogs` collection, so conversations from before tickets survive. */
export const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>(
    "SupportTicket",
    SupportTicketSchema,
    "supportchatlogs",
  );

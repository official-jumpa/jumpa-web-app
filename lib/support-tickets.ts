/**
 * The support ticket's vocabulary, shared by the API, the admin routes and the
 * screens. Client-safe: no mongoose, no server imports.
 */
import type { ChatAttachment } from "@/lib/chat-attachments";
import type { TransactionKind } from "@/lib/wallet";

/**
 * ai        — the assistant is answering
 * requested — handed off, waiting for a person to claim it
 * live      — a person holds it
 * pending   — a person handed it to a team; due by `slaDueAt`
 * resolved  — answered; a user reply reopens it
 * closed    — resolved and left alone for a week; read-only
 */
export const TICKET_STATUSES = [
  "ai",
  "requested",
  "live",
  "pending",
  "resolved",
  "closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  "transaction",
  "account",
  "kyc",
  "card",
  "bug",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["normal", "high"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Teams a ticket can be handed to while it waits on work outside support. */
export const HANDOFF_TEAMS = [
  "payments",
  "verification",
  "engineering",
  "cards",
] as const;
export type HandoffTeam = (typeof HANDOFF_TEAMS)[number];

/** The triage chips on a new conversation. */
export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  transaction: "A transaction",
  account: "My account",
  kyc: "Verification",
  card: "Cards",
  bug: "Something's broken",
  other: "Something else",
};

/** Statuses where a person holds the ticket and the assistant stays silent. */
const HUMAN_HELD: readonly TicketStatus[] = ["requested", "live", "pending"];

export function isHumanHeld(status: TicketStatus): boolean {
  return HUMAN_HELD.includes(status);
}

/** Anything the user can still write into. */
export function isOpenTicket(status: TicketStatus): boolean {
  return status !== "resolved" && status !== "closed";
}

export type StatusTone = "ai" | "waiting" | "active" | "done";

export const STATUS_COPY: Record<
  TicketStatus,
  { label: string; tone: StatusTone }
> = {
  ai: { label: "Assistant", tone: "ai" },
  requested: { label: "Waiting for team", tone: "waiting" },
  live: { label: "With the team", tone: "active" },
  pending: { label: "Being looked into", tone: "active" },
  resolved: { label: "Resolved", tone: "done" },
  closed: { label: "Closed", tone: "done" },
};

/** A transaction as it was when the user attached it — the thread never re-reads it. */
export interface TicketTransaction {
  id: string;
  kind: TransactionKind;
  title: string;
  amount: string;
  status: "completed" | "pending" | "failed";
  /** epoch ms, like `Transaction.createdAt`. */
  createdAt: number;
}

/** The snapshot shown while a transaction is staged, before the server takes its own. */
export function toTicketTransaction(tx: TicketTransaction): TicketTransaction {
  const { id, kind, title, amount, status, createdAt } = tx;
  return { id, kind, title, amount, status, createdAt };
}

/** Roles a user can see. Internal notes never leave the server on the user side. */
export type TicketMessageRole = "user" | "assistant" | "agent" | "system";

export interface TicketMessage {
  id: string;
  role: TicketMessageRole;
  content: string;
  attachments?: ChatAttachment[];
  /** First name only on the user side. */
  agentName?: string;
  transaction?: TicketTransaction;
  /** ISO. */
  createdAt: string;
}

export interface TicketView {
  id: string;
  ref: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority;
  transactionIds: string[];
  /** First name of whoever holds it. */
  agentName: string | null;
  slaDueAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

/** One row on the Messages list. */
export interface TicketSummary {
  id: string;
  ref: string;
  subject: string;
  status: TicketStatus;
  preview: string;
  updatedAt: string;
  /** The team wrote since the user last opened it. */
  unread: boolean;
}

/** What the waiting card says about how long a person will take. */
export interface ReplyEstimate {
  open: boolean;
  /** "Usually replies in about 12 minutes" or "Back at 8:00 AM WAT tomorrow". */
  text: string;
  hours: string;
}

/** Response of GET /api/support/tickets/:id. */
export interface TicketThread {
  ticket: TicketView;
  messages: TicketMessage[];
  estimate: ReplyEstimate | null;
  /** Echo it back as `since` on the next poll. */
  cursor: string;
}

export const MESSAGE_MAX = 3000;

/** "today, 3:00 PM", "tomorrow, 9:00 AM" or "Thu 16 Oct, 3:00 PM", on the device's clock. */
export function formatDeadline(date: Date): string {
  const midnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(date) - midnight(new Date())) / 86_400_000);
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (days === 0) return `today, ${time}`;
  if (days === 1) return `tomorrow, ${time}`;
  const day = date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day}, ${time}`;
}

/** How often the open thread re-reads, by status. */
export function pollInterval(status: TicketStatus): number | null {
  if (status === "requested" || status === "live") return 5_000;
  if (status === "pending") return 30_000;
  return null;
}

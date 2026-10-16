import { randomInt } from "node:crypto";
import type { UpdateQuery } from "mongoose";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import {
  addSupportMinutes,
  CLAIM_ALERT_MINUTES,
  describeSupportHours,
  describeSupportTime,
  isWithinSupportHours,
  nextSupportOpening,
  supportMinutesBetween,
} from "@/lib/support-hours";
import {
  isHumanHeld,
  type ReplyEstimate,
  type TicketCategory,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
  type TicketThread,
  type TicketView,
} from "@/lib/support-tickets";
import {
  type ISupportMessage,
  type ISupportTicket,
  type SupportMessageRole,
  SupportTicket,
} from "@/models/SupportTicket";

/** A refusal the routes turn straight into an HTTP response. */
export class TicketError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TicketError";
  }
}

/** Side effects a transition asks for; `supportEventFunctions` carries them out. */
export type SupportEvent =
  | { type: "escalated"; ticket: ISupportTicket }
  | { type: "reopened"; ticket: ISupportTicket }
  | { type: "claim_overdue"; ticket: ISupportTicket }
  | { type: "sla_breached"; ticket: ISupportTicket };

export interface TicketResult {
  ticket: ISupportTicket;
  events: SupportEvent[];
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const PREVIEW_MAX = 120;
/** Seen-at writes are a presence heartbeat too, so they are throttled, not skipped. */
const SEEN_HEARTBEAT_MS = 30_000;
/** Resolved tickets close after a quiet week. */
const AUTO_CLOSE_MS = 7 * DAY;

// ── References ────────────────────────────────────────────────────────────────

/** No 0/O, 1/I: a ref gets read out over the phone. */
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newRef(): string {
  let code = "";
  for (let i = 0; i < 6; i++)
    code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `JMP-${code}`;
}

function isDuplicateRef(err: unknown): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  return e?.code === 11000 && !!e.keyPattern?.ref;
}

/** Retries the rare ref collision instead of surfacing it. */
async function withFreshRef<T>(write: (ref: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(newRef());
    } catch (err) {
      if (!isDuplicateRef(err) || attempt >= 4) throw err;
    }
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function supportMessage(
  role: SupportMessageRole,
  content: string,
  extra: Partial<Omit<ISupportMessage, "id" | "role" | "content">> = {},
): ISupportMessage {
  return {
    id: generateId("msg"),
    role,
    content,
    timestamp: new Date(),
    ...extra,
  };
}

const firstName = (name?: string | null) =>
  name?.trim().split(/\s+/)[0] || null;

const iso = (date?: Date | null) =>
  date ? new Date(date).toISOString() : null;

function previewOf(message: ISupportMessage): string {
  const text = message.content.trim().replace(/\s+/g, " ");
  if (text)
    return text.length > PREVIEW_MAX
      ? `${text.slice(0, PREVIEW_MAX - 1)}…`
      : text;
  if (message.transaction) return "Shared a transaction";
  if (message.attachments?.length) return "Sent an attachment";
  return "";
}

// ── Serialisers (the user side never sees notes or full agent names) ──────────

export function toTicketView(ticket: ISupportTicket): TicketView {
  return {
    id: ticket._id,
    ref: ticket.ref ?? "",
    subject: ticket.subject || "Support conversation",
    status: ticket.status,
    category: ticket.category ?? null,
    priority: ticket.priority ?? "normal",
    transactionIds: ticket.transactionIds ?? [],
    agentName: firstName(ticket.claimedBy?.name),
    slaDueAt: iso(ticket.slaDueAt),
    escalatedAt: iso(ticket.escalatedAt),
    resolvedAt: iso(ticket.resolvedAt),
    rating: ticket.rating?.score ?? null,
    createdAt: iso(ticket.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(ticket.updatedAt) ?? new Date().toISOString(),
  };
}

export function toTicketMessage(
  message: ISupportMessage,
): TicketMessage | null {
  if (message.role === "note") return null;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.attachments?.length
      ? { attachments: message.attachments }
      : {}),
    ...(message.role === "agent"
      ? { agentName: firstName(message.agentName) ?? "Jumpa" }
      : {}),
    ...(message.transaction ? { transaction: message.transaction } : {}),
    createdAt: iso(message.timestamp) ?? new Date().toISOString(),
  };
}

function isUnread(ticket: ISupportTicket): boolean {
  if (!ticket.lastAgentMessageAt) return false;
  return !ticket.userSeenAt || ticket.lastAgentMessageAt > ticket.userSeenAt;
}

export function toTicketSummary(ticket: ISupportTicket): TicketSummary {
  const last = [...(ticket.messages ?? [])]
    .reverse()
    .find((m) => m.role !== "note");
  return {
    id: ticket._id,
    ref: ticket.ref ?? "",
    subject: ticket.subject || "Support conversation",
    status: ticket.status,
    preview: last ? previewOf(last) : "",
    updatedAt: iso(ticket.updatedAt) ?? new Date().toISOString(),
    unread: isUnread(ticket),
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Brings conversations from the old one-thread-per-user model up to date: a
 * ref, a subject, and "open" read as "ai". Atomic writes, never `.save()` —
 * the legacy status would fail the new enum.
 */
async function migrateLegacyTickets(userId: string): Promise<void> {
  const legacy = await SupportTicket.find({
    userId,
    $or: [{ ref: { $exists: false } }, { status: "open" as TicketStatus }],
  })
    .select("ref status subject messages")
    .lean<
      Pick<ISupportTicket, "_id" | "ref" | "status" | "subject" | "messages">[]
    >();

  for (const doc of legacy) {
    const firstUser =
      doc.messages?.find((m) => m.role === "user")?.content ?? "";
    const set: Record<string, unknown> = {};
    if ((doc.status as string) === "open") set.status = "ai";
    if (!doc.subject)
      set.subject = firstUser.slice(0, 80) || "Support conversation";

    await withFreshRef((ref) =>
      SupportTicket.updateOne(
        { _id: doc._id },
        { $set: doc.ref ? set : { ...set, ref } },
        { timestamps: false },
      ),
    );
  }
}

export async function listUserTickets(
  userId: string,
): Promise<TicketSummary[]> {
  await connectDB();
  await migrateLegacyTickets(userId);
  const tickets = await SupportTicket.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select({ messages: { $slice: -10 } })
    .lean<ISupportTicket[]>();
  return tickets.map(toTicketSummary);
}

export async function getUserTicket(
  userId: string,
  id: string,
): Promise<ISupportTicket | null> {
  await connectDB();
  const ticket = await SupportTicket.findOne({
    _id: id,
    userId,
  }).lean<ISupportTicket>();
  if (!ticket || (ticket.ref && (ticket.status as string) !== "open"))
    return ticket;
  await migrateLegacyTickets(userId);
  return SupportTicket.findOne({ _id: id, userId }).lean<ISupportTicket>();
}

/** The open conversation already about this transaction, so a second tap does not fork it. */
export async function findOpenTicketForTransaction(
  userId: string,
  transactionId: string,
): Promise<string | null> {
  await connectDB();
  const ticket = await SupportTicket.findOne({
    userId,
    transactionIds: transactionId,
    status: { $nin: ["resolved", "closed"] },
  })
    .sort({ updatedAt: -1 })
    .select("_id")
    .lean<Pick<ISupportTicket, "_id">>();
  return ticket?._id ?? null;
}

/** The newest message instant; the client echoes it back as `since`. */
function cursorOf(ticket: ISupportTicket): string {
  const last =
    ticket.messages?.at(-1)?.timestamp ?? ticket.updatedAt ?? new Date();
  return new Date(last).toISOString();
}

/**
 * The user's view of one ticket. With `since`, only messages at or after it —
 * `$gte`, so two messages in the same millisecond are never skipped; the
 * client dedupes by id.
 */
export async function getTicketThread(
  userId: string,
  id: string,
  since?: Date | null,
): Promise<TicketThread | null> {
  const ticket = await getUserTicket(userId, id);
  if (!ticket) return null;

  const messages = (ticket.messages ?? [])
    .filter((m) => !since || new Date(m.timestamp) >= since)
    .map(toTicketMessage)
    .filter((m): m is TicketMessage => m !== null);

  return {
    ticket: toTicketView(ticket),
    messages,
    estimate:
      ticket.status === "requested" ? await getReplyTimeEstimate() : null,
    cursor: cursorOf(ticket),
  };
}

/**
 * Marks the thread seen. Throttled, but always written when something is
 * unread — the timestamp also tells the reply email whether the user is here.
 */
export async function markTicketSeen(
  userId: string,
  id: string,
): Promise<void> {
  const now = new Date();
  await SupportTicket.updateOne(
    {
      _id: id,
      userId,
      $or: [
        { userSeenAt: null },
        { userSeenAt: { $lt: new Date(now.getTime() - SEEN_HEARTBEAT_MS) } },
        { $expr: { $lt: ["$userSeenAt", "$lastAgentMessageAt"] } },
      ],
    },
    { $set: { userSeenAt: now } },
    { timestamps: false },
  );
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createTicket(input: {
  userId: string;
  subject: string;
  category?: TicketCategory | null;
}): Promise<ISupportTicket> {
  await connectDB();
  const created = await withFreshRef((ref) =>
    SupportTicket.create({
      userId: input.userId,
      ref,
      subject: input.subject.slice(0, 120),
      category: input.category ?? null,
    }),
  );
  return created.toObject() as ISupportTicket;
}

type Scope = { _id: string; userId?: string };

/**
 * One guarded transition: only applies while the ticket is in `from`. A miss is
 * a 404 when the ticket does not exist and a 409 when it moved on.
 */
async function apply(
  scope: Scope,
  from: readonly TicketStatus[],
  update: UpdateQuery<ISupportTicket>,
  conflict: string,
): Promise<ISupportTicket> {
  await connectDB();
  const ticket = await SupportTicket.findOneAndUpdate(
    { ...scope, status: { $in: from } },
    update,
    { returnDocument: "after", runValidators: true },
  ).lean<ISupportTicket>();
  if (ticket) return ticket;

  const exists = await SupportTicket.exists(scope);
  throw new TicketError(
    exists ? conflict : "Conversation not found.",
    exists ? 409 : 404,
  );
}

/** Appends the user's message; who answers it is the caller's decision. A resolved ticket goes through `reopenTicket`. */
export async function appendUserMessages(
  scope: Scope,
  messages: ISupportMessage[],
  transactionIds: string[] = [],
): Promise<ISupportTicket> {
  return apply(
    scope,
    ["ai", "requested", "live", "pending"],
    {
      $push: { messages: { $each: messages } },
      $set: { lastUserMessageAt: new Date() },
      ...(transactionIds.length
        ? { $addToSet: { transactionIds: { $each: transactionIds } } }
        : {}),
    },
    "This conversation is closed. Start a new one and we'll pick it up from there.",
  );
}

export async function appendAssistantMessage(
  scope: Scope,
  content: string,
): Promise<ISupportTicket> {
  return apply(
    scope,
    ["ai"],
    { $push: { messages: supportMessage("assistant", content) } },
    "A person has this conversation now.",
  );
}

export interface EscalationInput {
  category?: TicketCategory | null;
  priority?: TicketPriority;
  reason: string;
  summary?: string | null;
  /** Said to the user as the handoff happens. */
  message?: string;
}

/** ai → requested. Idempotent: escalating a ticket a person already holds is a no-op. */
export async function escalateTicket(
  scope: Scope,
  input: EscalationInput,
): Promise<TicketResult> {
  const now = new Date();
  const set: Record<string, unknown> = {
    status: "requested",
    escalatedAt: now,
    claimDueAt: addSupportMinutes(now, CLAIM_ALERT_MINUTES),
    claimAlertedAt: null,
    reason: input.reason,
  };
  if (input.category) set.category = input.category;
  // Only ever raised here; a trigger never lowers what someone else set.
  if (input.priority === "high") set.priority = "high";
  if (input.summary) set.aiSummary = input.summary;

  try {
    const ticket = await apply(
      scope,
      ["ai"],
      {
        $set: set,
        ...(input.message
          ? { $push: { messages: supportMessage("assistant", input.message) } }
          : {}),
      },
      "Already with the team.",
    );
    return { ticket, events: [{ type: "escalated", ticket }] };
  } catch (err) {
    if (!(err instanceof TicketError) || err.status !== 409) throw err;
    const current = await SupportTicket.findOne(scope).lean<ISupportTicket>();
    if (current && isHumanHeld(current.status))
      return { ticket: current, events: [] };
    throw err;
  }
}

/** resolved → requested, carrying the user's new message. */
export async function reopenTicket(
  scope: Scope,
  messages: ISupportMessage[],
  transactionIds: string[] = [],
): Promise<TicketResult> {
  const now = new Date();
  const ticket = await apply(
    scope,
    ["resolved"],
    {
      $set: {
        status: "requested",
        escalatedAt: now,
        claimDueAt: addSupportMinutes(now, CLAIM_ALERT_MINUTES),
        claimAlertedAt: null,
        claimedBy: null,
        claimedAt: null,
        resolvedAt: null,
        slaDueAt: null,
        slaBreachedAt: null,
        handoffTeam: null,
        rating: null,
        reason: "Reopened by the user",
        lastUserMessageAt: now,
      },
      $push: {
        messages: {
          $each: [
            supportMessage("system", "Conversation reopened"),
            ...messages,
          ],
        },
      },
      ...(transactionIds.length
        ? { $addToSet: { transactionIds: { $each: transactionIds } } }
        : {}),
    },
    "This conversation can't be reopened. Start a new one.",
  );
  return { ticket, events: [{ type: "reopened", ticket }] };
}

export async function rateTicket(
  userId: string,
  id: string,
  score: number,
  comment?: string | null,
): Promise<ISupportTicket> {
  return apply(
    { _id: id, userId },
    ["resolved", "closed"],
    {
      $set: {
        rating: {
          score,
          ...(comment?.trim() ? { comment: comment.trim() } : {}),
          at: new Date(),
        },
      },
    },
    "You can rate a conversation once it's resolved.",
  );
}

// ── Timers (run by the support cron) ──────────────────────────────────────────

/** Tickets nobody claimed in time. Each is alerted once. */
export async function sweepOverdueClaims(
  now = new Date(),
): Promise<SupportEvent[]> {
  await connectDB();
  const events: SupportEvent[] = [];
  for (let i = 0; i < 100; i++) {
    const ticket = await SupportTicket.findOneAndUpdate(
      { status: "requested", claimDueAt: { $lte: now }, claimAlertedAt: null },
      { $set: { claimAlertedAt: now } },
      { returnDocument: "after", timestamps: false },
    ).lean<ISupportTicket>();
    if (!ticket) break;
    events.push({ type: "claim_overdue", ticket });
  }
  return events;
}

/** Handed-off tickets past their promise: raised to high and said so in the thread. */
export async function sweepBreachedSlas(
  now = new Date(),
): Promise<SupportEvent[]> {
  await connectDB();
  const events: SupportEvent[] = [];
  for (let i = 0; i < 100; i++) {
    const ticket = await SupportTicket.findOneAndUpdate(
      { status: "pending", slaDueAt: { $lte: now }, slaBreachedAt: null },
      {
        $set: { slaBreachedAt: now, priority: "high", lastAgentMessageAt: now },
        $push: {
          messages: supportMessage(
            "system",
            "This is taking longer than we promised. It's now a priority for the team and we'll update you here.",
          ),
        },
      },
      { returnDocument: "after" },
    ).lean<ISupportTicket>();
    if (!ticket) break;
    events.push({ type: "sla_breached", ticket });
  }
  return events;
}

export async function closeStaleResolved(now = new Date()): Promise<number> {
  await connectDB();
  const result = await SupportTicket.updateMany(
    {
      status: "resolved",
      resolvedAt: { $lte: new Date(now.getTime() - AUTO_CLOSE_MS) },
    },
    { $set: { status: "closed", closedAt: now } },
  );
  return result.modifiedCount;
}

// ── Reply-time estimate ───────────────────────────────────────────────────────

const ESTIMATE_WINDOW_MS = 14 * DAY;
const ESTIMATE_SAMPLES = 30;
const ESTIMATE_MIN_SAMPLES = 5;
const ESTIMATE_CACHE_MS = 5 * MINUTE;

let estimateCache: { at: number; minutes: number | null } | null = null;

/** Median working minutes from escalation to first claim, over recent tickets. */
async function medianClaimMinutes(now: Date): Promise<number | null> {
  if (estimateCache && now.getTime() - estimateCache.at < ESTIMATE_CACHE_MS) {
    return estimateCache.minutes;
  }
  await connectDB();
  const recent = await SupportTicket.find({
    claimedAt: { $gte: new Date(now.getTime() - ESTIMATE_WINDOW_MS) },
    escalatedAt: { $ne: null },
  })
    .sort({ claimedAt: -1 })
    .limit(ESTIMATE_SAMPLES)
    .select("escalatedAt claimedAt")
    .lean<Pick<ISupportTicket, "escalatedAt" | "claimedAt">[]>();

  const samples = recent
    .flatMap((t) =>
      t.escalatedAt && t.claimedAt
        ? [
            supportMinutesBetween(
              new Date(t.escalatedAt),
              new Date(t.claimedAt),
            ),
          ]
        : [],
    )
    .sort((a, b) => a - b);

  const minutes =
    samples.length < ESTIMATE_MIN_SAMPLES
      ? null
      : samples[Math.floor(samples.length / 2)];
  estimateCache = { at: now.getTime(), minutes };
  return minutes;
}

function describeWait(minutes: number): string {
  if (minutes < 1.5) return "in about a minute";
  if (minutes < 55) return `in about ${Math.round(minutes)} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "in about an hour" : `in about ${hours} hours`;
}

/** What the waiting card promises: measured, never invented. */
export async function getReplyTimeEstimate(
  now = new Date(),
): Promise<ReplyEstimate> {
  const hours = describeSupportHours();
  if (!isWithinSupportHours(now)) {
    return {
      open: false,
      text: `Our team is back at ${describeSupportTime(nextSupportOpening(now), now)}`,
      hours,
    };
  }
  const minutes = await medianClaimMinutes(now);
  return {
    open: true,
    text:
      minutes === null
        ? "Someone from the team will reply here as soon as they're free"
        : `The team usually replies ${describeWait(minutes)}`,
    hours,
  };
}

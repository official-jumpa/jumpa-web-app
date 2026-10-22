/**
 * One user message, start to finish: store it, then decide who answers — a
 * rule, the assistant, or the person who already holds the ticket.
 */
import {
  runSupportAgentCompletion,
  type SupportAgentContext,
  type SupportChatMessage,
} from "@/lib/ai/support-agent";
import { analyzeImageWithGemini } from "@/lib/ai/vision";
import {
  type ChatAttachment,
  describeAttachments,
  isImageAttachment,
} from "@/lib/chat-attachments";
import {
  appendAssistantMessage,
  appendUserMessages,
  createTicket,
  escalateTicket,
  getUserTicket,
  reopenTicket,
  type SupportEvent,
  supportMessage,
  TicketError,
} from "@/lib/functions/supportTicketFunctions";
import {
  formatDbTransaction,
  getTransactionById,
} from "@/lib/functions/transactionFunctions";
import {
  isHumanHeld,
  type TicketCategory,
  type TicketTransaction,
} from "@/lib/support-tickets";
import { detectEscalation, type Escalation } from "@/lib/support-triggers";
import type { ISupportMessage, ISupportTicket } from "@/models/SupportTicket";

/** How much of the thread the assistant reads back. */
const HISTORY_LIMIT = 12;
const SUBJECT_MAX = 80;

export interface PostMessageInput {
  userId: string;
  context: SupportAgentContext;
  /** Absent: start a new conversation with this message. */
  ticketId?: string;
  text: string;
  attachments: ChatAttachment[];
  transactionId?: string | null;
  category?: TicketCategory | null;
}

export interface PostMessageResult {
  ticketId: string;
  events: SupportEvent[];
}

interface SharedTransaction {
  snapshot: TicketTransaction;
  /** Every row of the receipt, for the assistant. */
  details: string;
}

/** Resolved from the user's own history, never from what the client claims. */
async function shareTransaction(
  userId: string,
  id: string,
): Promise<SharedTransaction> {
  const tx = await getTransactionById(id, userId);
  if (!tx) throw new TicketError("We couldn't find that transaction.", 404);
  const view = formatDbTransaction(tx);
  return {
    snapshot: {
      id: String(view.id),
      kind: view.kind,
      title: view.title,
      amount: view.amount,
      status: view.status,
      createdAt: view.createdAt,
    },
    details: [
      `${view.title} · ${view.amount} · ${view.status}`,
      ...view.rows.map((row) => `${row.label}: ${row.copy ?? row.value}`),
    ].join("\n"),
  };
}

function subjectFor(text: string, shared: SharedTransaction | null): string {
  const line = text.trim().replace(/\s+/g, " ");
  if (line)
    return line.length > SUBJECT_MAX
      ? `${line.slice(0, SUBJECT_MAX - 1)}…`
      : line;
  return shared
    ? `Help with ${shared.snapshot.title.toLowerCase()}`
    : "Support conversation";
}

/** What the user is told as a person takes over. */
function handoffMessage(
  escalation: Pick<Escalation, "priority" | "category">,
): string {
  const lines = [
    "I've passed this to the Jumpa support team. Someone will reply right here, and we'll email you when they do.",
  ];
  if (escalation.priority === "high" && escalation.category === "account") {
    lines.push(
      "If you think someone else can get into your account, change your login password now in Settings > Security. Never share your recovery phrase or PIN with anyone, including us.",
    );
  }
  return lines.join("\n\n");
}

function transactionNote(transaction: TicketTransaction): string {
  return `[The user attached a transaction: ${transaction.title} · ${transaction.amount} · ${transaction.status}]`;
}

/** The thread as the assistant should read it. Notes and system lines stay out. */
function historyFor(
  ticket: ISupportTicket,
  skipId: string,
): SupportChatMessage[] {
  return (ticket.messages ?? [])
    .filter((m) => m.id !== skipId)
    .filter(
      (m) => m.role === "user" || m.role === "assistant" || m.role === "agent",
    )
    .slice(-HISTORY_LIMIT)
    .map((m): SupportChatMessage => {
      if (m.role !== "user") {
        return {
          role: "assistant",
          content: m.role === "agent" ? `(Jumpa team) ${m.content}` : m.content,
        };
      }
      const parts = [
        m.content,
        m.transaction ? transactionNote(m.transaction) : "",
        describeAttachments(m.attachments),
      ];
      return { role: "user", content: parts.filter(Boolean).join("\n\n") };
    })
    .filter((m) => m.content.trim());
}

/** Image readings for the assistant; a failed reading is skipped, not fatal. */
async function readImages(
  attachments: ChatAttachment[],
  text: string,
): Promise<string> {
  const images = attachments.filter((a) => isImageAttachment(a.mime));
  if (!images.length) return "";
  const results = await Promise.allSettled(
    images.map((image) => analyzeImageWithGemini(image.url, text)),
  );
  return results
    .map((result, i) =>
      result.status === "fulfilled"
        ? `Image [${images[i].name}]:\n${result.value.analysis}`
        : "",
    )
    .filter(Boolean)
    .join("\n\n");
}

/** The assistant's turn on an `ai` ticket that no rule handed over. */
async function answer(
  ticket: ISupportTicket,
  input: PostMessageInput,
  shared: SharedTransaction | null,
  messageId: string,
): Promise<SupportEvent[]> {
  const scope = { _id: ticket._id, userId: input.userId };
  // The message just stored is rebuilt below with the receipt and image detail.
  const history = historyFor(ticket, messageId);
  const vision = await readImages(input.attachments, input.text);
  const current = [
    input.text,
    shared
      ? `[The user attached this transaction from their history]\n${shared.details}`
      : "",
    describeAttachments(input.attachments, vision),
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await runSupportAgentCompletion(
    [...history, { role: "user", content: current }],
    input.context,
  );

  try {
    if (result.handoff) {
      const { events } = await escalateTicket(scope, {
        ...result.handoff,
        message: handoffMessage(result.handoff),
      });
      return events;
    }
    await appendAssistantMessage(scope, result.reply);
  } catch (err) {
    // A person took the ticket while the assistant was thinking; their word wins.
    if (!(err instanceof TicketError && err.status === 409)) throw err;
  }
  return [];
}

/** Stores the message, then whoever should answer it does. */
export async function postUserMessage(
  input: PostMessageInput,
): Promise<PostMessageResult> {
  const text = input.text.trim();
  const shared = input.transactionId
    ? await shareTransaction(input.userId, input.transactionId)
    : null;

  const message: ISupportMessage = supportMessage("user", text, {
    ...(input.attachments.length ? { attachments: input.attachments } : {}),
    ...(shared ? { transaction: shared.snapshot } : {}),
  });
  const transactionIds = shared ? [shared.snapshot.id] : [];

  let ticket: ISupportTicket | null = input.ticketId
    ? await getUserTicket(input.userId, input.ticketId)
    : await createTicket({
        userId: input.userId,
        subject: subjectFor(text, shared),
        category: input.category ?? (shared ? "transaction" : null),
      });
  if (!ticket) throw new TicketError("Conversation not found.", 404);

  // Earlier user messages, read before this one lands, for the repeat rule.
  const earlier = (ticket.messages ?? [])
    .filter((m) => m.role === "user" && m.content)
    .map((m) => m.content);

  // One retry: the status can change between the read and the write.
  for (let attempt = 0; ; attempt++) {
    const scope = { _id: ticket._id, userId: input.userId };
    try {
      if (ticket.status === "closed") {
        throw new TicketError(
          "This conversation is closed. Start a new one and we'll pick it up from there.",
          409,
        );
      }

      if (ticket.status === "resolved") {
        const reopened = await reopenTicket(scope, [message], transactionIds);
        return { ticketId: ticket._id, events: reopened.events };
      }

      const stored = await appendUserMessages(scope, [message], transactionIds);
      // A person holds it: the assistant stays quiet and the team is told.
      if (isHumanHeld(stored.status)) {
        return {
          ticketId: stored._id,
          events: [{ type: "user_replied", ticket: stored, message }],
        };
      }

      const rule = detectEscalation({
        message: text,
        history: earlier,
        transaction: shared?.snapshot,
      });
      if (rule) {
        const { events } = await escalateTicket(scope, {
          ...rule,
          message: handoffMessage(rule),
        });
        return { ticketId: stored._id, events };
      }

      return {
        ticketId: stored._id,
        events: await answer(stored, input, shared, message.id),
      };
    } catch (err) {
      if (!(err instanceof TicketError && err.status === 409) || attempt >= 1)
        throw err;
      ticket = await getUserTicket(input.userId, ticket._id);
      if (!ticket) throw new TicketError("Conversation not found.", 404);
    }
  }
}

/** "Talk to a human": the user's own request, no rule or model involved. */
export async function requestHuman(
  userId: string,
  ticketId: string,
): Promise<PostMessageResult> {
  const ticket = await getUserTicket(userId, ticketId);
  if (!ticket) throw new TicketError("Conversation not found.", 404);
  if (isHumanHeld(ticket.status)) return { ticketId, events: [] };
  if (ticket.status !== "ai") {
    throw new TicketError("Send a message to reopen this conversation.", 409);
  }

  const escalation = {
    category: ticket.category ?? "other",
    priority: "normal",
    reason: "Asked for a person",
  } as const;
  const { events } = await escalateTicket(
    { _id: ticketId, userId },
    { ...escalation, message: handoffMessage(escalation) },
  );
  return { ticketId, events };
}

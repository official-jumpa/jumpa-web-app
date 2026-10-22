import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  closeStaleResolved,
  type SupportEvent,
  sweepBreachedSlas,
  sweepOverdueClaims,
} from "@/lib/functions/supportTicketFunctions";
import { supportHref } from "@/lib/support";
import {
  pingSupportChannel,
  type SupportAlert,
  ticketDashboardUrl,
} from "@/lib/support-alerts";
import { sendDelayEmail, sendTeamAlertEmail } from "@/lib/support-emails";
import {
  CLAIM_ALERT_MINUTES,
  describeSupportHours,
  describeSupportTime,
  isWithinSupportHours,
} from "@/lib/support-hours";
import { CATEGORY_LABEL } from "@/lib/support-tickets";
import type { INotification } from "@/models/Notification";
import type { ISupportMessage, ISupportTicket } from "@/models/SupportTicket";
import { User } from "@/models/User";

/** Longest a reply waits on its alerts; the alerts keep going if the host allows it. */
const ALERT_WAIT_MS = 8_000;
/** Messages this close together are one burst: every one reaches the chat, one email. */
const REPLY_EMAIL_GAP_MS = 2 * 60_000;

/**
 * Sends the alerts before the reply returns. Not `after()`: a host that freezes
 * the server once the response is out drops that work with no error.
 */
export async function dispatchSupportEvents(
  events: SupportEvent[],
): Promise<void> {
  if (!events.length) return;
  await Promise.race([
    runSupportEvents(events),
    new Promise((resolve) => setTimeout(resolve, ALERT_WAIT_MS)),
  ]);
}

/** Each event is isolated: one failed email does not stop the next alert. */
export async function runSupportEvents(events: SupportEvent[]): Promise<void> {
  for (const event of events) {
    try {
      await handle(event);
    } catch (err) {
      console.error(`[support-events] ${event.type} failed:`, err);
    }
  }
}

/**
 * One pass of the support timers: alerts unclaimed tickets, raises handed-off
 * ones past their promise, closes resolved ones after a quiet week. Every sweep
 * marks what it touched, so a second run alerts nobody twice.
 */
export async function runSupportSweep(now = new Date()) {
  const overdue = await sweepOverdueClaims(now);
  const breached = await sweepBreachedSlas(now);
  const closed = await closeStaleResolved(now);
  await runSupportEvents([...overdue, ...breached]);
  return { unclaimed: overdue.length, breached: breached.length, closed };
}

interface Recipient {
  email: string;
  firstName: string | null;
}

async function recipientFor(userId: string): Promise<Recipient | null> {
  await connectDB();
  const user = await User.findById(userId)
    .select("email name nickname")
    .lean<{ email?: string; name?: string | null; nickname?: string | null }>();
  if (!user?.email) return null;
  const name = user.nickname || user.name;
  return { email: user.email, firstName: name?.trim().split(/\s+/)[0] || null };
}

function mailFor(ticket: ISupportTicket, to: Recipient) {
  return {
    to: to.email,
    firstName: to.firstName,
    ticketId: ticket._id,
    ref: ticket.ref,
    subject: ticket.subject || "your support request",
  };
}

function notify(
  ticket: ISupportTicket,
  data: Pick<INotification, "type" | "title" | "body">,
) {
  return createNotification({
    userId: ticket.userId,
    tab: "activities",
    link: supportHref("chat", { ticket: ticket._id }),
    metadata: { ticketId: ticket._id, ref: ticket.ref },
    ...data,
  });
}

const teamName = (team: string | null) =>
  team ? `${team[0].toUpperCase()}${team.slice(1)}` : "Assigned";

/** The customer's most recent message, which is usually what tipped it over. */
function latestUserMessage(ticket: ISupportTicket): string | null {
  const last = ticket.messages
    ?.slice()
    .reverse()
    .find((m) => m.role === "user" && m.content.trim());
  return last ? last.content.trim() : null;
}

/** Their last message, plus the opening line when the two differ. */
function customerWords(ticket: ISupportTicket, name: string | null) {
  const latest = latestUserMessage(ticket);
  const words = latest ?? ticket.subject;
  const quote = words
    ? {
        label: name ? `Latest message from ${name}` : "Latest message",
        text: words.length > 400 ? `${words.slice(0, 399)}…` : words,
      }
    : undefined;
  const opener =
    ticket.subject && ticket.subject !== words
      ? [{ label: "First message", value: ticket.subject }]
      : [];
  return { quote, opener };
}

const topic = (ticket: ISupportTicket) =>
  ticket.category
    ? [{ label: "Topic", value: CATEGORY_LABEL[ticket.category] }]
    : [];

const at = (date: Date | null) =>
  date ? describeSupportTime(new Date(date)) : null;

/** Where the ticket stands, in the team's words. */
function stateOf(ticket: ISupportTicket): string {
  switch (ticket.status) {
    case "requested":
      return "Waiting to be claimed";
    case "live":
      return ticket.claimedBy ? `Live with ${ticket.claimedBy.name}` : "Live";
    case "pending":
      return ticket.handoffTeam
        ? `With the ${teamName(ticket.handoffTeam)} team`
        : "Handed to a team";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return "With the assistant";
  }
}

/** The new message itself; a file or transaction on its own still says something. */
function replyWords(message: ISupportMessage, name: string | null) {
  const files = message.attachments?.length ?? 0;
  const text =
    message.content.trim() ||
    (message.transaction
      ? `Shared a transaction: ${message.transaction.title}, ${message.transaction.amount}`
      : files
        ? `Sent ${files === 1 ? "an attachment" : `${files} attachments`}`
        : "");
  return {
    label: name ? `New message from ${name}` : "New message",
    text: text.length > 400 ? `${text.slice(0, 399)}…` : text,
  };
}

/** One alert per event; the chat and the email both read it. */
function alertFor(event: SupportEvent, name: string | null): SupportAlert {
  const { ticket } = event;
  const who = name ?? "A customer";
  const { quote, opener } = customerWords(ticket, name);
  const base = {
    ref: ticket.ref,
    customer: name,
    state: stateOf(ticket),
    high: ticket.priority === "high",
    quote,
    summary: ticket.aiSummary ?? undefined,
    link: ticketDashboardUrl(ticket._id),
  };
  const claimBy = at(ticket.claimDueAt);
  const claimWindow = isWithinSupportHours()
    ? `Claim it within ${CLAIM_ALERT_MINUTES} minutes so they aren't left waiting.`
    : `It came in outside support hours (${describeSupportHours()}), so it's due once the team is back.`;

  switch (event.type) {
    case "escalated":
      return {
        ...base,
        tone: "new",
        emoji: "🆕",
        event: "New ticket",
        headline: `${who} needs a person`,
        lead: claimWindow,
        fields: [
          ...topic(ticket),
          ...(ticket.reason
            ? [{ label: "Why it came to us", value: ticket.reason }]
            : []),
          ...(claimBy ? [{ label: "Claim by", value: claimBy }] : []),
          ...opener,
        ],
      };
    case "reopened":
      return {
        ...base,
        tone: "new",
        emoji: "🔁",
        event: "Reopened",
        headline: `${who} reopened their conversation`,
        lead: `They replied after it was marked resolved, so it's back in the queue. ${claimWindow}`,
        fields: [
          ...topic(ticket),
          ...(claimBy ? [{ label: "Claim by", value: claimBy }] : []),
          ...opener,
        ],
      };
    case "claim_overdue":
      return {
        ...base,
        tone: "warn",
        emoji: "⏰",
        event: "Still unclaimed",
        headline: `${who} is still waiting`,
        lead: "Nobody has claimed this ticket and it's past its claim window. Please pick it up.",
        fields: [
          ...topic(ticket),
          ...(ticket.reason
            ? [{ label: "Why it came to us", value: ticket.reason }]
            : []),
          ...(claimBy ? [{ label: "Was due", value: claimBy }] : []),
          ...opener,
        ],
      };
    case "sla_breached": {
      const team = teamName(ticket.handoffTeam);
      const due = at(ticket.slaDueAt);
      return {
        ...base,
        tone: "urgent",
        emoji: "🚨",
        event: "Update overdue",
        headline: `${name ? `${name}'s` : "A customer's"} update is overdue`,
        lead: `The ${team} team promised an update${due ? ` by ${due}` : ""} and hasn't sent one. It's now high priority, and ${name ?? "the customer"} has been told it's taking longer.`,
        fields: [
          { label: "Team", value: team },
          ...(due ? [{ label: "Was due", value: due }] : []),
          ...(ticket.claimedBy
            ? [{ label: "Handled by", value: ticket.claimedBy.name }]
            : []),
          ...topic(ticket),
        ],
      };
    }
    case "user_replied": {
      const agent = ticket.claimedBy?.name;
      const team = teamName(ticket.handoffTeam);
      const due = at(ticket.slaDueAt);
      const files = event.message.attachments?.length ?? 0;
      const lead =
        ticket.status === "live"
          ? `${agent ?? "An agent"} has this chat. Reply in the dashboard.`
          : ticket.status === "pending"
            ? `It's with the ${team} team${due ? `, and their update is due by ${due}` : ""}.`
            : "Nobody has claimed it yet. Claim it and reply.";
      return {
        ...base,
        quote: replyWords(event.message, name),
        // The summary was sent with the handover; repeating it on every message is noise.
        summary: undefined,
        tone: "info",
        emoji: "💬",
        event: "New reply",
        headline: `${who} sent a new message`,
        lead,
        fields: [
          ...(ticket.status === "live" && agent
            ? [{ label: "Handled by", value: agent }]
            : []),
          ...(ticket.status === "pending"
            ? [
                { label: "Team", value: team },
                ...(due ? [{ label: "Update due by", value: due }] : []),
              ]
            : []),
          ...(ticket.status === "requested" && claimBy
            ? [{ label: "Claim by", value: claimBy }]
            : []),
          ...(files && event.message.content.trim()
            ? [
                {
                  label: "Attached",
                  value: `${files} file${files === 1 ? "" : "s"}`,
                },
              ]
            : []),
          ...topic(ticket),
        ],
      };
    }
  }
}

/**
 * Every event emails, except a reply that follows the user's own message
 * within the gap: a burst of messages is one email.
 */
function shouldEmail(event: SupportEvent): boolean {
  if (event.type !== "user_replied") return true;
  const thread = event.ticket.messages ?? [];
  const i = thread.findIndex((m) => m.id === event.message.id);
  const previous = i > 0 ? thread[i - 1] : null;
  if (previous?.role !== "user") return true;
  const gap =
    new Date(event.message.timestamp).getTime() -
    new Date(previous.timestamp).getTime();
  return gap >= REPLY_EMAIL_GAP_MS;
}

/** A live chat's reply goes to the agent holding it; everything else to the team. */
function emailRecipients(event: SupportEvent): string[] | undefined {
  const agent = event.ticket.claimedBy?.email;
  return event.type === "user_replied" &&
    event.ticket.status === "live" &&
    agent
    ? [agent]
    : undefined;
}

async function handle(event: SupportEvent): Promise<void> {
  const { ticket } = event;
  // A failed name lookup costs the alert its name, never the alert itself.
  const to = await recipientFor(ticket.userId).catch((err) => {
    console.warn("[support-events] Customer lookup failed:", err);
    return null;
  });
  const alert = alertFor(event, to?.firstName ?? null);

  // Chat and email go out together, the moment it happens.
  await Promise.all([
    pingSupportChannel(alert),
    shouldEmail(event)
      ? sendTeamAlertEmail(alert, emailRecipients(event))
      : null,
  ]);

  if (event.type === "sla_breached") {
    await notify(ticket, {
      type: "SUPPORT_TICKET_UPDATED",
      title: "Taking longer than we said",
      body: `"${ticket.subject}" is now a priority for the team.`,
    });
    if (to) await sendDelayEmail(mailFor(ticket, to));
  }
}

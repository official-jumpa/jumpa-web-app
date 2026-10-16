/**
 * Rules that hand a conversation to a person without asking the model. A model
 * can talk itself out of escalating; these cannot. Pure, so they test in isolation.
 */
import type {
  TicketCategory,
  TicketPriority,
  TicketTransaction,
} from "@/lib/support-tickets";

export interface Escalation {
  category: TicketCategory;
  priority: TicketPriority;
  /** Shown to the agent at the top of the ticket. */
  reason: string;
}

const ASKS_FOR_PERSON =
  /\b(talk|speak|chat)\s+(to|with)\s+(a\s+|an\s+)?(real\s+|live\s+)?(human|person|agent|some\s*one|somebody|staff|support|representative|rep)\b|\b(real|live)\s+(person|human|agent)\b|\bhuman\s+(agent|support|being)\b|\bcustomer\s+(care|service)\b|\bescalat/i;

const SECURITY =
  /\b(fraud|scam(med)?|hack(ed|er)?|stolen|stole|compromised|unauthori[sz]ed|didn'?t\s+(make|authori[sz]e)|someone\s+(took|sent|withdrew|accessed))\b/i;

/** Words that only ever mean money went somewhere it should not have. */
const MONEY_PROBLEM =
  /\b(debited|deducted|lost\s+my)\b|\bwhere\s+is\s+my\s+(money|funds?|naira|usdc|usdt|transfer|deposit|withdrawal)\b/i;

/** Phrasings that mean the same only when the message is about money — not an OTP. */
const NOT_ARRIVED =
  /\b(not|never|haven'?t|hasn'?t|didn'?t|wasn'?t|isn'?t)\s+(been\s+|yet\s+)?(receiv|credit|arriv|reflect|deliver|land)|\b(missing|disappeared|stuck|refund\w*|revers\w*)\b/i;
const MONEY_CONTEXT =
  /\b(money|funds?|naira|ngn|usdc|usdt|xlm|sol|eth|btc|transfer|deposit|withdraw\w*|payment|paid|balance|airtime|swap|bridge|crypto|token)\b|₦|\$/i;

/** 64-hex (EVM/Stellar hashes) or a long base58 run (Solana signatures). */
const TX_HASH = /\b(0x)?[a-f0-9]{64}\b|\b[1-9A-HJ-NP-Za-km-z]{80,90}\b/i;

/** A provider or Jumpa reference pasted from a receipt or a bank SMS. */
const REFERENCE =
  /\b(ref(erence)?|session\s*id|tx\s*id|txn)\s*[:#-]?\s*(?=[A-Z0-9-]*\d)[A-Z0-9-]{8,}\b/i;

/** Asking the same thing again means the answer did not land. */
const REPEAT_SIMILARITY = 0.8;

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

/** Jaccard similarity of the two messages' word sets. */
export function similarity(a: string, b: string): number {
  const left = words(a);
  const right = words(b);
  if (left.size < 3 || right.size < 3) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  return shared / (left.size + right.size - shared);
}

/**
 * The first rule this message trips, or null. `history` is the user's earlier
 * messages in this ticket, oldest first.
 */
export function detectEscalation(input: {
  message: string;
  history: string[];
  transaction?: TicketTransaction | null;
}): Escalation | null {
  const { message, history, transaction } = input;

  if (SECURITY.test(message)) {
    return {
      category: "account",
      priority: "high",
      reason: "Possible fraud or account compromise",
    };
  }

  if (transaction?.status === "failed") {
    return {
      category: "transaction",
      priority: "normal",
      reason: `Failed transaction attached: ${transaction.title}`,
    };
  }

  if (ASKS_FOR_PERSON.test(message)) {
    return {
      category: "other",
      priority: "normal",
      reason: "Asked for a person",
    };
  }

  if (
    MONEY_PROBLEM.test(message) ||
    (NOT_ARRIVED.test(message) && MONEY_CONTEXT.test(message))
  ) {
    return {
      category: "transaction",
      priority: "normal",
      reason: "Money missing or not credited",
    };
  }

  if (TX_HASH.test(message) || REFERENCE.test(message)) {
    return {
      category: "transaction",
      priority: "normal",
      reason: "Pasted a transaction hash or reference",
    };
  }

  if (
    history.some((earlier) => similarity(earlier, message) >= REPEAT_SIMILARITY)
  ) {
    return {
      category: "other",
      priority: "normal",
      reason: "Asked the same question again",
    };
  }

  return null;
}

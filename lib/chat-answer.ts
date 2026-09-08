/**
 * Which row a chooser card's answer picked. A chooser is answered by the next
 * user message — the same rule `/api/chat/send` uses to know a bare value
 * belongs to a card — so the pick survives a reload without being persisted.
 */

import type {
  BankDetails,
  ChatContact,
  ChatOption,
  ChatPlan,
} from "@/lib/chat";
import type { IChatMessage } from "@/models/ChatLog";

/** The card kinds a reply can answer. */
const CHOOSERS = new Set(["options", "plans", "contacts", "accounts"]);

/**
 * Maps each chooser card to the reply it got, keyed by message id. Nothing is
 * persisted for this — the answer is the next user message either way, so a
 * reloaded transcript already carries every pick the user made.
 */
export function answersByCard(messages: IChatMessage[]) {
  const answers = new Map<string, string>();
  let chooserId: string | undefined;

  for (const msg of messages) {
    if (msg.role === "user") {
      if (chooserId && msg.content) answers.set(chooserId, msg.content);
      chooserId = undefined;
    } else if (msg.id && msg.cardType && CHOOSERS.has(msg.cardType)) {
      chooserId = msg.id;
    }
  }

  return answers;
}

/** The reply is our own string, sent verbatim, so an exact match is enough. */
function same(reply: string, answer: string) {
  return reply.trim().toLowerCase() === answer.trim().toLowerCase();
}

/**
 * A "Custom" row asks for a value instead of answering with its own label. The
 * label check is a fallback for a card that omits the flag — the designer's own
 * copy is "Custom" / "Custom Amount".
 */
export function isCustom(option: ChatOption) {
  return option.custom ?? /^custom\b/i.test(option.label);
}

/** Row keys, shared by the render and the lookup so the two cannot drift. */
export const optionKey = (option: ChatOption, index: number) =>
  option.id ?? `${option.label}-${index}`;

export const planKey = (plan: ChatPlan, index: number) =>
  plan.id ?? `${plan.name}-${index}`;

export const contactKey = (contact: ChatContact, index: number) =>
  contact.id ?? `${contact.name}-${index}`;

/**
 * Key of the option the answer picked. A typed value matches no label, so a
 * Custom row takes it — unless `claimed` says something else on the same card
 * matched exactly, which is what stops two rows lighting at once.
 */
export function answeredOption(
  options: ChatOption[],
  answer?: string,
  claimed?: boolean,
): string | null {
  if (!answer) return null;

  const exact = options.findIndex((option) =>
    same(option.reply ?? option.label, answer),
  );
  if (exact >= 0) return optionKey(options[exact], exact);

  if (claimed) return null;
  const custom = options.findIndex(isCustom);
  return custom >= 0 ? optionKey(options[custom], custom) : null;
}

export function answeredPlan(
  plans: ChatPlan[],
  answer?: string,
): string | null {
  if (!answer) return null;
  const index = plans.findIndex((plan) => same(plan.reply ?? plan.name, answer));
  return index >= 0 ? planKey(plans[index], index) : null;
}

export function answeredContact(
  contacts: ChatContact[],
  answer?: string,
): string | null {
  if (!answer) return null;
  const index = contacts.findIndex((contact) =>
    same(contact.reply ?? contact.name, answer),
  );
  return index >= 0 ? contactKey(contacts[index], index) : null;
}

/** A Copy pill never replies, so only a reply action can have been answered. */
export function answeredAction(details: BankDetails, answer?: string) {
  const action = details.action;
  if (!answer || !action || (action.kind ?? "copy") === "copy") return false;
  return same(action.reply ?? action.label, answer);
}

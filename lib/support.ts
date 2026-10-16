/** Help & Support: the ways in, and the FAQ copy behind them. */
import type { TicketCategory } from "@/lib/support-tickets";

/**
 * TODO(backend): replace with the real support inbox before launch. The Email
 * Us row opens the device's mail client against this address.
 */
export const SUPPORT_EMAIL = "support@usejumpa.com";

export const SUPPORT_SUBJECT = "Jumpa support request";

export const JUMPA_COMMUNITY_WHATSAPP_URL =
  "https://chat.whatsapp.com/KExp42DN6gr9yPkSUpIa6L?mode=gi_t";

/** `mailto:` for the Email Us row. */
export function supportMailto(): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;
}

export type SupportView = "chat" | "faqs" | "messages";

/**
 * Every support URL is built here. `ticket` opens a conversation; `tx` starts
 * a new one with that transaction already attached.
 */
export function supportHref(
  view?: SupportView,
  params: { ticket?: string; tx?: string } = {},
): string {
  if (!view) return "/support";
  const query = new URLSearchParams({ view });
  if (params.ticket) query.set("t", params.ticket);
  if (params.tx) query.set("tx", params.tx);
  return `/support?${query.toString()}`;
}

export interface Faq {
  question: string;
  answer: string;
  /** Offered while a ticket in this category waits for a person. */
  categories?: TicketCategory[];
}

/**
 * The questions are the designer's, verbatim. The answers are not on the frame
 * — it prints placeholder text — so they are written against what the app
 * actually does.
 *
 * TODO(content): have support sign these answers off and replace them.
 */
export const FAQS: Faq[] = [
  {
    question: "How do I reset my password?",
    categories: ["account"],
    answer:
      "Jumpa signs you in with a 6-digit login PIN rather than a password. Open Settings, then Security, and choose Change Login PIN. If you have forgotten it, use Forgot Login PIN on the same screen and we will send a verification code to your email.",
  },
  {
    question: "Can I use the app offline?",
    answer:
      "No. Balances, quotes and transfers are all read from the network in real time, so Jumpa needs a connection. Your recovery phrase is the one thing you should keep offline.",
  },
  {
    question: "How do I update my payment method?",
    categories: ["card"],
    answer:
      "Open the Cards tab to add a new card or manage an existing one. For bank and mobile money details, the account you send to is chosen each time in the transfer flow, so there is nothing saved to update.",
  },
  {
    question: "How do I delete my account?",
    categories: ["account"],
    answer:
      "Open Settings and scroll to the Account section, then choose Delete Account. Your wallet is self-custodial, so deleting the account does not delete your funds. Export your recovery phrase first, because only that can reach them afterwards.",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "Start a live chat from this screen for the fastest answer, or use Email Us to write to the support team. Live chat is the better route for anything involving a transaction.",
  },
  // TODO(content): the three below are not from the design; have support sign them off.
  {
    question: "My transfer is still pending. What happens now?",
    categories: ["transaction"],
    answer:
      "Most transfers settle within a few minutes, but a bank or network can hold one for longer. Your transaction history updates on its own once it settles, and if it fails the money comes back to the balance it left.",
  },
  {
    question:
      "I sent crypto to the wrong address or network. Can it be reversed?",
    categories: ["transaction"],
    answer:
      "Transactions on a blockchain are final once confirmed, so nobody, including Jumpa, can pull them back. If the address belongs to an exchange, contact that exchange with the transaction hash from your receipt.",
  },
  {
    question: "Why did my verification fail?",
    categories: ["kyc"],
    answer:
      "The usual causes are a blurred or cropped ID photo, glare on the document, or a selfie that does not match the ID. Retake both in good light with the whole document in frame, then submit again.",
  },
];

/**
 * Up to `limit` questions worth reading about `category`. With `fallback` off,
 * a category with none of its own returns nothing rather than the general list.
 */
export function faqsFor(
  category: TicketCategory | null,
  { limit = 3, fallback = true }: { limit?: number; fallback?: boolean } = {},
): Faq[] {
  const matching = category
    ? FAQS.filter((faq) => faq.categories?.includes(category))
    : [];
  if (!matching.length && !fallback) return [];
  return (matching.length ? matching : FAQS).slice(0, limit);
}

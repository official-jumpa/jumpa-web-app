/** Help & Support: the three ways in, and the FAQ copy behind them. */

/**
 * TODO(backend): replace with the real support inbox before launch. The Email
 * Us row opens the device's mail client against this address.
 */
export const SUPPORT_EMAIL = "support@usejumpa.com";

export const SUPPORT_SUBJECT = "Jumpa support request";

/** `mailto:` for the Email Us row. */
export function supportMailto(): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;
}

export type SupportView = "chat" | "faqs";

export function supportHref(view?: SupportView): string {
  return view ? `/support?view=${view}` : "/support";
}

export interface Faq {
  question: string;
  answer: string;
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
    answer:
      "Open the Cards tab to add a new card or manage an existing one. For bank and mobile money details, the account you send to is chosen each time in the transfer flow, so there is nothing saved to update.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Open Settings and scroll to the Account section, then choose Delete Account. Your wallet is self-custodial, so deleting the account does not delete your funds. Export your recovery phrase first, because only that can reach them afterwards.",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "Start a live chat from this screen for the fastest answer, or use Email Us to write to the support team. Live chat is the better route for anything involving a transaction.",
  },
];

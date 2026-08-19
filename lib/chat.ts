/** Placeholder transcript from the design, replaced once the agent backend lands. */

/** Muted lead-in followed by an emphasised value, e.g. "Fee **0.3 XLM**". */
export type Stat = { lead?: string; value: string };

/** White row inside a card: caption above a value, with an optional badge. */
export type CardRow = { caption: string; value: string; badge?: string };

export type QuoteCard = {
  title: string;
  status: Stat;
  pay: CardRow;
  receive: CardRow;
  stats: [Stat, Stat];
};

export type ReceiptCard = {
  title: string;
  status: string;
  balance: CardRow;
  stats: [Stat, Stat];
};

/** One asset the user can pay with; the selected one is outlined in the design. */
export type AssetOption = {
  symbol: string;
  balance: string;
  amount: string;
  selected?: boolean;
};

export type TransferCard = {
  contact: { name: string; handle: string; avatar: string };
  amount: CardRow;
  prompt: string;
  options: AssetOption[];
};

export type ChatItem =
  /** `paragraph` renders the wider, squared-off bubble the design uses for prose. */
  | { kind: "text"; text: string; paragraph?: boolean }
  | { kind: "quote"; card: QuoteCard }
  | { kind: "receipt"; card: ReceiptCard }
  | { kind: "transfer"; card: TransferCard }
  /** Cancel / Confirm pair. Confirm is what raises the PIN sheet. */
  | { kind: "actions" };

/** Consecutive agent replies share one avatar, so the transcript is a list of groups. */
export type ChatEntry =
  | { id: string; kind: "day"; label: string }
  | { id: string; kind: "group"; role: "user" | "agent"; items: ChatItem[] };

const QUOTE: QuoteCard = {
  title: "Swapping",
  status: { lead: "Slippage ", value: "5%" },
  pay: { caption: "YOU PAY", value: "100", badge: "XLM" },
  receive: { caption: "YOU RECEIVE", value: "32", badge: "USD" },
  stats: [
    { lead: "Rate ", value: "1 XLM = 0.325 USD" },
    { lead: "Fee ", value: "0.3 XLM" },
  ],
};

const RECEIPT: ReceiptCard = {
  title: "Swapped",
  status: "Successful",
  balance: { caption: "BALANCE", value: "435", badge: "USD" },
  stats: [{ value: "+ 32 USD" }, { lead: "Fee ", value: "0.3 XLM" }],
};

const TRANSFER: TransferCard = {
  contact: {
    name: "Alice Jumpa",
    handle: "@alicej.umpa",
    avatar: "/images/chat/contact-alice.webp",
  },
  amount: { caption: "YOU'LL SEND", value: "50 USD" },
  prompt: "Which asset would you like to use?",
  options: [
    { symbol: "USDC", balance: "$450.50", amount: "50.00", selected: true },
    { symbol: "XLM", balance: "225.43", amount: "154" },
  ],
};

export const TRANSCRIPT: ChatEntry[] = [
  {
    id: "greeting",
    kind: "group",
    role: "user",
    items: [
      { kind: "text", text: "Heyyy, Jumpa" },
      { kind: "text", text: "Swap 20 USD to XLM" },
    ],
  },
  {
    id: "quote",
    kind: "group",
    role: "agent",
    items: [
      { kind: "text", text: "Finding you the best rate..." },
      { kind: "quote", card: QUOTE },
      {
        kind: "text",
        text: "Ready to proceed? I'll need your PIN to confirm the swap.",
        paragraph: true,
      },
      { kind: "actions" },
    ],
  },
  {
    id: "authorised",
    kind: "group",
    role: "user",
    items: [{ kind: "text", text: "Swap authorised" }],
  },
  {
    id: "receipt",
    kind: "group",
    role: "agent",
    items: [
      { kind: "text", text: "✓ Swap confirmed in 3.2 seconds" },
      { kind: "receipt", card: RECEIPT },
      {
        kind: "text",
        text: "Your USDC is now in your wallet. Want to send it, save it, or do something else?",
        paragraph: true,
      },
    ],
  },
  { id: "today", kind: "day", label: "Today" },
  {
    id: "send",
    kind: "group",
    role: "user",
    items: [{ kind: "text", text: "Send $50 to alice@jumpa.app" }],
  },
  {
    id: "transfer",
    kind: "group",
    role: "agent",
    items: [{ kind: "transfer", card: TRANSFER }, { kind: "actions" }],
  },
  {
    id: "asset",
    kind: "group",
    role: "user",
    items: [{ kind: "text", text: "USDC" }],
  },
  {
    id: "transfer-confirm",
    kind: "group",
    role: "agent",
    items: [
      {
        kind: "text",
        text: "Ready to proceed? I'll need your PIN to confirm the swap.",
        paragraph: true,
      },
      { kind: "actions" },
    ],
  },
];

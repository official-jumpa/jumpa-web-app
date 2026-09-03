/**
 * Placeholder card data from the design. Real details never reach the client like
 * this — they come from the card processor behind a PIN check.
 */

export type VirtualCard = {
  id: string;
  /** Masked PAN as printed on the card face. */
  last4: string;
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
  pin: string;
  frozen: boolean;
};

export const CARDS: VirtualCard[] = [
  {
    id: "primary",
    last4: "2638",
    holder: "ADEMOLA M. OLAYINKA",
    number: "3728 2748 4920 2191",
    expiry: "04/31",
    cvv: "234",
    pin: "2345",
    frozen: true,
  },
  {
    id: "second",
    last4: "4392",
    holder: "ADEMOLA M. OLAYINKA",
    number: "5417 9920 1183 4392",
    expiry: "11/29",
    cvv: "781",
    pin: "6014",
    frozen: false,
  },
  {
    id: "third",
    last4: "2141",
    holder: "ADEMOLA M. OLAYINKA",
    number: "4024 0071 5563 2141",
    expiry: "08/30",
    cvv: "455",
    pin: "9273",
    frozen: false,
  },
];

export type UsageLimit = {
  label: string;
  spent: string;
  cap: string;
  /** Share of the cap already used, 0–1. Drives the slider fill. */
  used: number;
};

export const CARD_TIER = "Tier 1";

export const USAGE_LIMITS: UsageLimit[] = [
  {
    label: "Online Usage",
    spent: "$738.39",
    cap: "$23,932.41",
    used: 168 / 321,
  },
  {
    label: "Physical Usage",
    spent: "$738.39",
    cap: "$23,932.41",
    used: 136 / 321,
  },
];

export type TransactionFilter = {
  label: string;
  options: string[];
};

export const TRANSACTION_FILTERS: TransactionFilter[] = [
  {
    label: "Transaction Type",
    options: ["Show All", "Transfer", "Swap", "Deposit", "Withdraw", "Utility"],
  },
  {
    label: "Card",
    options: ["Show All", "**** 4392", "**** 2141"],
  },
  {
    label: "Status",
    options: ["Show All", "Completed", "Pending", "Failed"],
  },
  {
    label: "Duration",
    options: ["Show All", "Last 7 Days", "Last 30 Days", "Last 90 Days"],
  },
  {
    label: "Chain",
    options: ["Show All", "Stellar", "Solana", "Base"],
  },
];

export const CARD_PERKS = [
  "One transaction only",
  "Highest security",
  "Auto-expires after use",
  "Instantly generated",
  "Zero cost",
];

export const CARD_CATEGORIES = [
  { value: "debit", label: "Debit Card" },
  { value: "credit", label: "Credit Card" },
] as const;

export type CardCategory = (typeof CARD_CATEGORIES)[number]["value"];

export type CardKind = "virtual" | "physical";

export const CARD_KINDS: { kind: CardKind; title: string; blurb: string }[] = [
  {
    kind: "virtual",
    title: "Get your Virtual card",
    blurb:
      "A real card for everyday payments, withdrawals, and purchases wherever you go.",
  },
  {
    kind: "physical",
    title: "Get your physical card",
    blurb:
      "A real card for everyday payments, withdrawals, and purchases wherever you go.",
  },
];

/** PIN handed back after a card is created. Placeholder until the processor issues one. */
export const NEW_CARD_PIN = "2345";

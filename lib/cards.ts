/**
 * Placeholder card data from the design. Real details never reach the client like
 * this — they come from the card processor behind a PIN check.
 */

export type VirtualCard = {
  id: string;
  /** Masked PAN as printed on the card face. */
  last4: string;
  /** Spendable on the card, already formatted. */
  balance: string;
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
  pin: string;
  frozen: boolean;
};

/** TODO: replace with the processor's real cards once the service exists. */
export const CARDS: VirtualCard[] = [
  {
    id: "primary",
    last4: "2638",
    balance: "$ 1,372.00",
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
    balance: "$ 240.18",
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
    balance: "$ 0.00",
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
    options: [
      "Show All",
      "Send",
      "Deposit",
      "Investment",
      "Savings",
      "Credit",
      "Airtime",
      "Data",
    ],
  },
  {
    label: "Card",
    options: ["Show All", "**** 4392", "**** 2141"],
  },
  {
    label: "Status",
    options: ["Show All", "Successful", "Pending", "Failed"],
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

/**
 * Wallets a card can be funded from. TODO: replace with the user's real
 * balances once the card processor exposes a funding endpoint.
 */
export type FundingAccount = {
  id: string;
  /** Wallet the money leaves, e.g. "USD". */
  label: string;
  /** Spendable, already formatted. */
  balance: string;
  /** Asset whose mark and ticker the amount screen shows. */
  symbol: string;
};

export const FUNDING_ACCOUNTS: FundingAccount[] = [
  { id: "usdc", label: "USD", balance: "$1,239.00", symbol: "USDC" },
  { id: "usdt", label: "USD", balance: "$450.50", symbol: "USDT" },
];

/** Chat types and data structures for Jumpa Assistant. */

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
  /** Open-ended: a settled transfer sends to/network/fee/hash, a swap only two. */
  stats: Stat[];
  explorerUrl?: string;
  txHash?: string;
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

export type OnrampCard = {
  title: string;
  fiatAmount: string;
  fiatCurrency: string;
  cryptoAmount: string;
  cryptoToken: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  reference: string;
  status: string;
};

export type OfframpCard = {
  title: string;
  cryptoAmount: string;
  cryptoToken: string;
  fiatAmount: string;
  fiatCurrency: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
};

export type ChatItem =
  /** `paragraph` renders the wider, squared-off bubble the design uses for prose. */
  | { kind: "text"; text: string; paragraph?: boolean }
  | { kind: "quote"; card: QuoteCard; isEditable?: boolean }
  | { kind: "receipt"; card: ReceiptCard }
  | { kind: "transfer"; card: TransferCard }
  | { kind: "onramp"; card: OnrampCard }
  | { kind: "offramp"; card: OfframpCard }
  /** Cancel / Confirm pair. Confirm is what raises the PIN sheet. */
  | { kind: "actions" };

/** Consecutive agent replies share one avatar, so the transcript is a list of groups. */
export type ChatEntry =
  | { id: string; kind: "day"; label: string }
  | { id: string; kind: "group"; role: "user" | "agent"; items: ChatItem[] };

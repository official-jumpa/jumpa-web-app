/** Chat types and data structures for Jumpa Assistant. */

/** Muted lead-in followed by an emphasised value, e.g. "Fee **0.3 XLM**". */
export type Stat = { lead?: string; value: string };

/** White row inside a card: caption above a value, with an optional badge. */
export type CardRow = { caption: string; value: string; badge?: string };

/** Pill opposite a card title. `done` is lime, `pending` purple. */
export type CardStatus = { label: string; tone?: "pending" | "done" };

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

/** Bank block: label/value lines above the account number and its action. */
export type BankDetails = {
  lines: { label: string; value: string }[];
  field: CardRow;
  /** Copy / View details / Confirm / Change — the design varies it per screen. */
  action?: { label: string; kind?: "copy" | "reply" };
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
  /** Switch / other provider transaction reference */
  reference: string;
  /** Switch / other provider asset string e.g. "base:usdc" */
  asset?: string;
  /** Notes from Switch / other provider (e.g. "Use exact amount") */
  notes?: string[];
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
  /** Switch / other provider deposit address — crypto wallet to send the asset to */
  depositAddress?: string;
  /** Switch / other provider asset string e.g. "base:usdc" */
  asset?: string;
  /** Switch / other provider transaction reference */
  reference?: string;
  status: string;
};

/**
 * One row in a chooser. Picking it answers the agent, so `reply` is what gets
 * sent back; it falls back to the label.
 */
export type ChatOption = {
  id?: string;
  label: string;
  description?: string;
  /** Right-aligned figure, e.g. a balance on the cash-out chooser. */
  amount?: string;
  /** Named glyph from the icon set — see OPTION_ICONS. */
  icon?: string;
  reply?: string;
  selected?: boolean;
  /**
   * A "Custom" row: opens an inline field in place of the row so the user can
   * type their own value, which is then sent as the reply.
   */
  custom?: boolean;
  placeholder?: string;
};

export type OptionsCard = { options: ChatOption[] };

/** Contact chooser: avatar, name and one meta line with an optional bold tail. */
export type ChatContact = {
  id?: string;
  name: string;
  meta: string;
  metaStrong?: string;
  avatar?: string;
  reply?: string;
};

export type ContactsCard = { contacts: ChatContact[] };

/** Saved payout account, plus the rows that offer an alternative. */
export type AccountsCard = {
  title: string;
  account: BankDetails;
  options?: ChatOption[];
};

export type ChatItem =
  /**
   * `paragraph` renders the wider, squared-off bubble the design uses for prose.
   * `reveal` is set only on a reply that just arrived, so it types itself in.
   */
  | { kind: "text"; text: string; paragraph?: boolean; reveal?: boolean }
  | { kind: "quote"; card: QuoteCard; isEditable?: boolean }
  | { kind: "receipt"; card: ReceiptCard }
  | { kind: "transfer"; card: TransferCard }
  | { kind: "onramp"; card: OnrampCard }
  | { kind: "offramp"; card: OfframpCard }
  | { kind: "options"; card: OptionsCard }
  | { kind: "contacts"; card: ContactsCard }
  | { kind: "accounts"; card: AccountsCard }
  | { kind: "sep24"; card: any }
  /** Cancel / Confirm pair. Confirm is what raises the PIN sheet. */
  | { kind: "actions"; confirmLabel?: string; cancelLabel?: string | false };

/** Consecutive agent replies share one avatar, so the transcript is a list of groups. */
export type ChatEntry =
  | { id: string; kind: "day"; label: string }
  | { id: string; kind: "group"; role: "user" | "agent"; items: ChatItem[] };

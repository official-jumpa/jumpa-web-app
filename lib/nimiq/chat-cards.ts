/** A payment the chat has priced; the user confirms it in the chat and approves it in Nimiq Pay. */
export type ChatProposal =
  | {
      kind: "airtime";
      phone: string;
      network: string;
      amountNgn: number;
      /** Estimate at today's rate; the order sets the exact amount. */
      usdt: number;
    }
  | {
      kind: "data";
      phone: string;
      network: string;
      productName: string;
      /** "1.5GB · Monthly plan (30 days)". */
      plan: string;
      amountNgn: number;
      usdt: number;
    }
  | {
      kind: "cash-out";
      amountUsdt: string;
      bank: string;
      accountNumber: string;
      accountName: string;
      /** Estimate at today's rate. */
      amountNgn: number;
    }
  | { kind: "top-up"; amountNgn: number; usdt: number };

/** One data bundle offered in the chat. */
export type ChatDataPlan = {
  productName: string;
  size: string;
  validity: string;
  price: string;
  amountNgn: number;
};

/** What a reply carries under its text. */
export type ChatCard =
  | { type: "confirm"; proposal: ChatProposal }
  | {
      type: "plans";
      phone: string;
      network: string;
      /** Naira per USDT, to price the picked plan. */
      perUsdt: number;
      plans: ChatDataPlan[];
    }
  /** Picking one sends its reply as the user's next message. */
  | { type: "choices"; options: { label: string; reply: string }[] }
  | { type: "history" };

/** USDT this many Naira costs at the rate, rounded up to the cent like the server. */
export const usdtFor = (naira: number, perUsdt: number) =>
  Math.ceil((naira / perUsdt) * 100) / 100;

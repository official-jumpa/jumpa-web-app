/** One line of a deposit instruction, with the value the user has to copy. */
export type DepositField = {
  label: string;
  value: string;
  /** Off for a value nobody needs on their clipboard, e.g. a currency. */
  copy?: boolean;
};

export type DepositRail = {
  id: "bank" | "momo";
  label: string;
  /** Sentence above the fields. */
  intro: string;
  fields: DepositField[];
};

/**
 * Placeholder deposit instructions — visibly not a real account. The fiat
 * on-ramp replaces these with the account the rails issue per user.
 */
export const FIAT_RAILS: DepositRail[] = [
  {
    id: "bank",
    label: "Bank transfer",
    intro: "Transfer from your bank app to the account below.",
    fields: [
      { label: "Account name", value: "Jumpa / Test Account", copy: true },
      { label: "Account number", value: "0000 0000 00", copy: true },
      { label: "Bank", value: "Providus Bank", copy: true },
      { label: "Currency", value: "NGN" },
    ],
  },
  {
    id: "momo",
    label: "Mobile money",
    intro: "Send from your mobile money wallet to the number below.",
    fields: [
      { label: "Merchant name", value: "Jumpa / Test Merchant", copy: true },
      { label: "Merchant number", value: "000000", copy: true },
      { label: "Network", value: "MTN, Airtel, 9mobile" },
      { label: "Currency", value: "NGN" },
    ],
  },
];

/** Narration the rails match a transfer back to an account with. */
export const DEPOSIT_REFERENCE = "JUMPA-0000";

/** One selling point on the Open NGN Account intro. */
export type NgnBenefit = {
  id: "receive" | "details" | "convert";
  title: string;
  description: string;
};

export const NGN_BENEFITS: NgnBenefit[] = [
  {
    id: "receive",
    title: "Receive payments locally",
    description:
      "Get paid directly into your Nigerian account from anyone, anywhere in Nigeria.",
  },
  {
    id: "details",
    title: "Dedicated NGN detail",
    description:
      "Get dedicated NGN account details for receiving local transfers.",
  },
  {
    id: "convert",
    title: "Convert instantly",
    description: "Exchange NGN to USD whenever you want, right inside Jumpa.",
  },
];

/** How long the opening modal holds. */
export const NGN_OPENING_MS = 2400;

/** A line of the issued account, with the value the user can copy. */
export type NgnAccountField = {
  label: string;
  value: string;
};

/**
 * Placeholder account details — visibly not a real account.
 * The rail that issues NGN accounts replaces these per user.
 */
export const NGN_ACCOUNT_FIELDS: NgnAccountField[] = [
  { label: "Bank Name", value: "Jumpa / Test Bank" },
  { label: "Account Number", value: "1234 5678 90" },
  { label: "Account Name", value: "Jumpa / Test Account" },
];

/** Placeholder until a profile carries a number the user has verified. */
export const NGN_PHONE = "+234 906 179 3498";

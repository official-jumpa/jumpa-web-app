/** One selling point on the Open USD Account intro. */
export type UsdBenefit = {
  id: "spend" | "details" | "convert";
  title: string;
  description: string;
};

export const USD_BENEFITS: UsdBenefit[] = [
  {
    id: "spend",
    title: "Spend globally",
    description:
      "Use your USD balance for international payments and everyday purchases.",
  },
  {
    id: "details",
    title: "Dedicated USD detail",
    description:
      "Get dedicated USD account details for receiving payments from abroad.",
  },
  {
    id: "convert",
    title: "Convert instantly",
    description: "Exchange USD to NGN whenever you want, right inside Jumpa.",
  },
];

/** How long the opening modal holds. No rail issues an account yet. */
export const OPENING_MS = 2400;

/** A line of the issued account, with the value the user can copy. */
export type UsdAccountField = {
  label: string;
  value: string;
};

/**
 * Placeholder account details — visibly not a real account, the same call as
 * `FIAT_RAILS`. The rail that issues USD accounts replaces these per user.
 */
export const USD_ACCOUNT_FIELDS: UsdAccountField[] = [
  { label: "Bank Name", value: "Jumpa / Test Bank" },
  { label: "Account Number", value: "0000 0000 00" },
  { label: "Account Name", value: "Jumpa / Test Account" },
];

/** Placeholder until a profile carries a number the user has verified. */
export const USD_PHONE = "+234 906 179 3498";

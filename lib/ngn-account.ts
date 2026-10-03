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

/** How long the opening modal holds when animating transitions. */
export const NGN_OPENING_MS = 2400;

/** A line of the issued account, with the value the user can copy. */
export type NgnAccountField = {
  label: string;
  value: string;
};

export const COUNTRY_ISO_TO_NAME: Record<string, string> = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  RW: "Rwanda",
  UG: "Uganda",
  TZ: "Tanzania",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
};

export function mapCountryCodeToName(codeOrName: string): string {
  if (!codeOrName) return "Nigeria";
  const upper = codeOrName.trim().toUpperCase();
  return COUNTRY_ISO_TO_NAME[upper] || codeOrName.trim();
}

/**
 * Calculates NGN deposit (virtual account collection) fee:
 * - Below ₦10,000: Free (₦0)
 * - ₦10,000 and above: 1%
 */
export function calculateFossaPayDepositFee(amount: number): number {
  if (amount < 10000) return 0;
  return amount * 0.01;
}

/**
 * Calculates NGN withdrawal (bank payout) fee based on official tier schedule:
 * - ₦0 – ₦50,000: ₦25
 * - Above ₦50,000: ₦50
 */
export function calculateFossaPayWithdrawalFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 50000) return 25;
  return 50;
}


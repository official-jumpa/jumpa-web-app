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
 * Calculates FossaPay deposit (virtual account collection) fee based on official tier schedule:
 * - ₦0 – ₦4,999.99: ₦60
 * - ₦5,000 – ₦9,999.99: ₦100
 * - ₦10,000 – ₦14,999.99: ₦150
 * - ₦15,000 – ₦24,999.99: ₦200
 * - ₦25,000 and above: 1.2% (capped at ₦1,000)
 */
export function calculateFossaPayDepositFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount < 5000) return 60;
  if (amount < 10000) return 100;
  if (amount < 15000) return 150;
  if (amount < 25000) return 200;
  return Math.min(amount * 0.012, 1000);
}

/**
 * Calculates FossaPay withdrawal (bank payout) fee based on official tier schedule:
 * - ₦0 – ₦5,000: ₦30
 * - ₦5,001 – ₦9,999: ₦50
 * - ₦10,000 – ₦50,000: ₦100
 * - Above ₦50,000: ₦150
 */
export function calculateFossaPayWithdrawalFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 5000) return 30;
  if (amount <= 9999) return 50;
  if (amount <= 50000) return 100;
  return 150;
}


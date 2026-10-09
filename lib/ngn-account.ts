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
 * Centralized NGN Account Configuration & Single Source of Truth
 */
export const NGN_FEE_CONFIG = {
  /** Maximum number of deposits per calendar day subsidized (free) by Jumpa */
  MAX_DAILY_FREE_DEPOSITS: 3,
  /** Maximum deposit amount (in NGN) eligible for Jumpa fee subsidy */
  FREE_DEPOSIT_THRESHOLD: 5000,
  /** Provider deposit collection fee rate (1%) */
  DEPOSIT_FEE_PERCENT: 0.01,
  /** Provider maximum fee cap on deposits */
  DEPOSIT_FEE_CAP: 1500,
} as const;

/**
 * Calculates NGN deposit (virtual account collection) fee:
 * - Free for deposits <= ₦5,000 up to 3 times per calendar day.
 * - Otherwise 1% capped at ₦1,500.
 */
export function calculateNgnDepositFee(
  amount: number,
  subsidizedCountToday: number = 0
): {
  feeChargedToUser: number;
  isSubsidizedByJumpa: boolean;
  providerFee: number;
  netCreditToUser: number;
} {
  if (amount <= 0) {
    return {
      feeChargedToUser: 0,
      isSubsidizedByJumpa: false,
      providerFee: 0,
      netCreditToUser: 0,
    };
  }

  const providerFee = Math.min(
    Math.round(amount * NGN_FEE_CONFIG.DEPOSIT_FEE_PERCENT),
    NGN_FEE_CONFIG.DEPOSIT_FEE_CAP
  );

  const eligibleForSubsidy =
    amount <= NGN_FEE_CONFIG.FREE_DEPOSIT_THRESHOLD &&
    subsidizedCountToday < NGN_FEE_CONFIG.MAX_DAILY_FREE_DEPOSITS;

  const feeChargedToUser = eligibleForSubsidy ? 0 : providerFee;
  const netCreditToUser = Math.max(0, amount - feeChargedToUser);

  return {
    feeChargedToUser,
    isSubsidizedByJumpa: eligibleForSubsidy,
    providerFee,
    netCreditToUser,
  };
}

/**
 * Calculates NGN withdrawal (bank payout) fee based on official tier schedule:
 * - ₦0 – ₦5,000: ₦25
 * - > ₦5,000 – ₦10,000: ₦50
 * - > ₦10,000 – ₦20,000: ₦70
 * - > ₦20,000 – ₦30,000: ₦100
 * - > ₦30,000 – ₦50,000: ₦120
 * - > ₦50,000 – ₦100,000: ₦150
 * - > ₦100,000 – ₦150,000: ₦200
 * - Above ₦150,000: ₦300
 */
export function calculateNgnWithdrawalFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 5000) return 25;
  if (amount <= 10000) return 50;
  if (amount <= 20000) return 70;
  if (amount <= 30000) return 100;
  if (amount <= 50000) return 120;
  if (amount <= 100000) return 150;
  if (amount <= 150000) return 200;
  return 300;
}
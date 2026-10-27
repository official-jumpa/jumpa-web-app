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
  /** Maximum number of deposits per calendar day subsidized (free) by Jumpa - Unlimited */
  MAX_DAILY_FREE_DEPOSITS: Infinity,
  /** Maximum deposit amount (in NGN) eligible for Jumpa fee subsidy - Unlimited */
  FREE_DEPOSIT_THRESHOLD: Infinity,
  /** Deposit collection fee rate charged to user (0% - Free) */
  DEPOSIT_FEE_PERCENT: 0,
  /** Maximum fee cap on deposits */
  DEPOSIT_FEE_CAP: 0,
  /** Deposits are 100% free on Jumpa */
  IS_DEPOSIT_FREE: true,
} as const;

/**
 * Calculates NGN deposit (virtual account collection) fee:
 * - 100% Free: Jumpa does not charge any deposit fee.
 * - Always credits the full deposited amount to the user with ₦0 fee.
 */
export function calculateNgnDepositFee(
  amount: number,
  _subsidizedCountToday: number = 0
): {
  feeChargedToUser: number;
  isSubsidizedByJumpa: boolean;
  providerFee: number;
  netCreditToUser: number;
} {
  if (amount <= 0) {
    return {
      feeChargedToUser: 0,
      isSubsidizedByJumpa: true,
      providerFee: 0,
      netCreditToUser: 0,
    };
  }

  return {
    feeChargedToUser: 0,
    isSubsidizedByJumpa: true,
    providerFee: 0,
    netCreditToUser: amount,
  };
}

/**
 * Calculates NGN withdrawal (bank payout) fee based on official tier schedule:
 * - ₦0 – ₦5,000: ₦25
 * - > ₦5,000 – ₦10,000: ₦70
 * - > ₦10,000 – ₦20,000: ₦100
 * - > ₦20,000 – ₦30,000: ₦125
 * - > ₦30,000 – ₦50,000: ₦150
 * - > ₦50,000 – ₦100,000: ₦200
 * - > ₦100,000 – ₦150,000: ₦300
 * - Above ₦150,000: ₦400
 */
export function calculateNgnWithdrawalFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 5000) return 25;
  if (amount <= 10000) return 75;
  if (amount <= 20000) return 100;
  if (amount <= 30000) return 125;
  if (amount <= 50000) return 150;
  if (amount <= 100000) return 200;
  if (amount <= 150000) return 300;
  return 400;
}
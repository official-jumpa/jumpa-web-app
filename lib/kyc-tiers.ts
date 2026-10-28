/** Verification levels and what each one unlocks. */
export type KycTierStatus = "done" | "current" | "next";

export interface KycTier {
  level: number;
  requirement: string;
  dailyLimit: string;
  /** `null` is the uncapped top tier. */
  maxTransaction: string | null;
}

// TODO(backend): placeholder limits from the design — replace with the real tier table.
export const KYC_TIERS: readonly KycTier[] = [
  {
    level: 1,
    requirement: "Phone number and email",
    dailyLimit: "₦50,000",
    maxTransaction: "₦300,000",
  },
  {
    level: 2,
    requirement: "BVN or NIN, plus a selfie",
    dailyLimit: "₦200,000",
    maxTransaction: "₦500,000",
  },
  {
    level: 3,
    requirement: "Government ID and proof of address",
    dailyLimit: "₦500,000",
    maxTransaction: null,
  },
];

export const TOP_TIER = KYC_TIERS.length;

// TODO(backend): read the account's tier; KYC status stands in for it.
export function currentTierLevel(kycVerified: boolean): number {
  return kycVerified ? 2 : 1;
}

export function tierStatus(level: number, current: number): KycTierStatus {
  if (level < current) return "done";
  return level === current ? "current" : "next";
}

export function findTier(level: number): KycTier | undefined {
  return KYC_TIERS.find((tier) => tier.level === level);
}

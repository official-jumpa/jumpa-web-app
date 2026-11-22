/**
 * The referral campaign's rules in one place. Safe to import on the client.
 * A referral pays once, to both sides, when the invited user has signed up
 * with the link, passed KYC and completed one qualifying ramp.
 */

/** Whole naira per successful referral. */
export const REFERRAL_REWARD_NGN = {
  referrer: 500,
  referred: 200,
} as const;

/** A completed on-ramp or off-ramp of at least $10 in USDC or USDT. */
export const QUALIFYING_TRANSACTION = {
  types: ["ONRAMP", "OFFRAMP"],
  tokens: ["USDC", "USDT"],
  minAmount: 10,
} as const;

export type ReferralStep = "signed_up" | "kyc" | "transaction";

/** Who is reading the steps: the inviter, or the friend who joined. */
export type ReferralPerspective = "referrer" | "referred";

type StepCopy = { title: string; body: string };

/** Copy for the three steps, in order, from each side. */
export const REFERRAL_STEPS: readonly ({ id: ReferralStep } & Record<
  ReferralPerspective,
  StepCopy
>)[] = [
  {
    id: "signed_up",
    referrer: {
      title: "Your friend signs up",
      body: "They create a Jumpa account with your link or code.",
    },
    referred: {
      title: "Sign up with an invite",
      body: "You joined with a friend's link or code.",
    },
  },
  {
    id: "kyc",
    referrer: {
      title: "They verify their identity",
      body: "They complete KYC in the app.",
    },
    referred: {
      title: "Verify your identity",
      body: "Complete KYC in the app.",
    },
  },
  {
    id: "transaction",
    referrer: {
      title: "They make their first $10 trade",
      body: "They buy or sell at least $10 of USDC or USDT.",
    },
    referred: {
      title: "Make your first $10 trade",
      body: "Buy or sell at least $10 of USDC or USDT.",
    },
  },
];

/** "₦500" — rewards are whole naira. */
export function formatRewardNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

/** Only the code's own characters, so a pasted link or stray symbol can't reach a query. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9-]{3,32}$/.test(code) ? code : null;
}

/** A claim's id (`rclm_…`) is the txHash of the Naira deposit it creates. */
export function isReferralClaimReference(
  txHash: string | null | undefined,
): boolean {
  return typeof txHash === "string" && txHash.startsWith("rclm_");
}

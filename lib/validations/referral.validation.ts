import { z } from "zod";

/**
 * Validation for applying a referral promo code.
 */
export const applyReferralCodeSchema = z.object({
  code: z
    .string({
      error: "Referral code is required",
    })
    .trim()
    .min(3, "Referral code must be at least 3 characters"),
});

export type ApplyReferralCodeInput = z.infer<typeof applyReferralCodeSchema>;

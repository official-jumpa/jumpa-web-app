import { z } from "zod";
import {
  hasPlusAlias,
  isEmailBlacklisted,
  normalizeEmail,
} from "@/lib/utils/email-policy";

/**
 * Validation schema for joining the waitlist.
 */
export const joinWaitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .refine((val) => !hasPlusAlias(val), {
      message: "Email aliases are not allowed.",
    })
    .refine((val) => !isEmailBlacklisted(val), {
      message: "This account has been suspended",
    })
    .transform((val) => normalizeEmail(val)),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  source: z.string().trim().max(50).optional().default("landing"),
  referrer: z.string().trim().max(255).optional(),
  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
  referralCode: z.string().trim().max(50).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;

/**
 * Validation schema for querying waitlist status.
 */
export const checkWaitlistSchema = z.object({
  email: z
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
});

export type CheckWaitlistInput = z.infer<typeof checkWaitlistSchema>;

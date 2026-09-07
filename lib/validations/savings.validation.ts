import { z } from "zod";
import { pinSchema } from "./user.validation";

/**
 * Validates savings plan creation payload.
 */
export const createSavingsPlanSchema = z.object({
  kind: z.enum(["individual", "lock", "circle"], {
    error: "Kind must be individual, lock, or circle",
  }).default("individual"),
  name: z
    .string({
      error: "Goal name is required",
    })
    .trim()
    .min(1, "Goal name is required")
    .max(50, "Goal name cannot exceed 50 characters"),
  category: z.string().trim().default("Other"),
  targetAmount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === undefined || val === "" ? undefined : Number(val)))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: "Target amount must be greater than 0",
    }),
  depositAmount: z
    .union([z.number(), z.string()])
    .default(0)
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Initial deposit amount cannot be negative",
    }),
  term: z.string().trim().default("30 DAYS"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  frequency: z.string().trim().default("Weekly"),
  debitDay: z.string().optional(),
  fundingSource: z.enum(["crypto", "usd", "ngn"]).default("crypto"),
  pin: pinSchema,
});

export type CreateSavingsPlanInput = z.infer<typeof createSavingsPlanSchema>;

/**
 * Validates top-up payload for an existing savings plan.
 */
export const topUpSavingsSchema = z.object({
  planId: z
    .string({
      error: "Plan ID is required",
    })
    .trim()
    .min(1, "Plan ID is required"),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Top-up amount must be greater than 0",
    }),
  fundingSource: z.enum(["crypto", "usd", "ngn"]).default("crypto"),
  pin: pinSchema,
});

export type TopUpSavingsInput = z.infer<typeof topUpSavingsSchema>;

/**
 * Validates withdrawal payload from a savings plan.
 */
export const withdrawSavingsSchema = z.object({
  planId: z
    .string({
      error: "Plan ID is required",
    })
    .trim()
    .min(1, "Plan ID is required"),
  amount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === undefined || val === "" ? undefined : Number(val)))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: "Withdrawal amount must be greater than 0",
    }),
  destination: z.string().default("wallet"),
  pin: pinSchema,
});

export type WithdrawSavingsInput = z.infer<typeof withdrawSavingsSchema>;

/**
 * Validates query params when fetching a specific plan's details.
 */
export const savingsPlanDetailsQuerySchema = z.object({
  id: z
    .string({
      error: "Invalid Plan ID",
    })
    .trim()
    .min(5, "Invalid Plan ID"),
});

export type SavingsPlanDetailsQueryInput = z.infer<typeof savingsPlanDetailsQuerySchema>;

/**
 * Validates marking a savings product intro as seen.
 */
export const savingsIntroSeenSchema = z.object({
  kind: z.enum(["individual", "lock", "circle"], {
    error: "Invalid kind",
  }),
});

export type SavingsIntroSeenInput = z.infer<typeof savingsIntroSeenSchema>;

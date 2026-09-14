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
  category: z.string().trim().nullish().transform((val) => val || "Other"),
  targetAmount: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
    .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
      message: "Target amount must be greater than 0",
    }),
  depositAmount: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((val) => (val === undefined || val === null || val === "" ? 0 : Number(val)))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Initial deposit amount cannot be negative",
    }),
  term: z.string().trim().nullish().transform((val) => val || "30 DAYS"),
  startDate: z
    .string()
    .nullish()
    .transform((val) => val || undefined)
    .refine(
      (val) => {
        if (!val) return true;
        const [year, month, day] = val.split(/[-/]/).map(Number);
        if (!year || !month || !day) {
          const date = new Date(val);
          if (isNaN(date.getTime())) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date.getTime() >= today.getTime();
        }
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inputDate.getTime() >= today.getTime();
      },
      { message: "Start date cannot be in the past" },
    ),
  endDate: z.string().nullish().transform((val) => val || undefined),
  frequency: z.string().trim().nullish().transform((val) => val || "Weekly"),
  debitDay: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((val) => (val == null || val === "" ? undefined : String(val).trim())),
  fundingSource: z.enum(["crypto", "usd", "ngn"]).nullish().transform((val) => val || "crypto"),
  pin: pinSchema,
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const s = new Date(data.startDate.replace(/-/g, "/")).getTime();
      const e = new Date(data.endDate.replace(/-/g, "/")).getTime();
      return e >= s;
    }
    return true;
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

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

/**
 * Validates query parameters for listing savings plans (GET /api/savings).
 */
export const listSavingsPlansQuerySchema = z.object({
  type: z.enum(["individual", "lock", "circle"]).optional(),
});

export type ListSavingsPlansQueryInput = z.infer<typeof listSavingsPlansQuerySchema>;

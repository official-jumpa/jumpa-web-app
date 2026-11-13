import { z } from "zod";
import { isTimeZone } from "@/lib/auto-save-schedule";
import { AUTO_SAVE_INTERVAL_MINUTES, LAST_DAY } from "@/lib/savings-auto-save";
import { pinSchema } from "./user.validation";

const planIdSchema = z.string().trim().min(1, "Savings plan is required");

/** PUT /api/v1/savings/auto-save: start a plan's rule or replace it. */
export const saveAutoSaveSchema = z.object({
  planId: planIdSchema,
  pin: pinSchema,
  cadence: z.enum(["daily", "weekly", "monthly", "custom"], {
    error: "Choose how often to save",
  }),
  amount: z
    .number({ error: "Enter an amount" })
    .int("Use a whole amount")
    .positive("Enter an amount"),
  source: z.enum(["ngn", "usdc"], { error: "Choose a wallet to pay with" }),
  weekday: z.number().int().min(0).max(6),
  monthDay: z
    .number()
    .int()
    .refine((day) => (day >= 1 && day <= 28) || day === LAST_DAY, {
      message: "Choose a day of the month",
    }),
  intervalMinutes: z
    .number()
    .int()
    .refine((minutes) => AUTO_SAVE_INTERVAL_MINUTES.includes(minutes), {
      message: "Choose how often to repeat",
    }),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time of day"),
  timeZone: z.string().refine(isTimeZone, { message: "Unknown time zone" }),
});

export type SaveAutoSaveInput = z.infer<typeof saveAutoSaveSchema>;

/** PATCH: pause or resume a rule. */
export const pauseAutoSaveSchema = z.object({
  planId: planIdSchema,
  paused: z.boolean(),
});

/** DELETE: turn a rule off. */
export const removeAutoSaveSchema = z.object({ planId: planIdSchema });

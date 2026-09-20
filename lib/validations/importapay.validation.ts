import { z } from "zod";

/**
 * Validates a deposit top-up request to issue a dynamic virtual account.
 */
export const depositNgnSchema = z.object({
  amount: z
    .number({ error: "Deposit amount must be a number" })
    .positive("Deposit amount must be greater than zero")
    .min(100, "Minimum deposit amount is ₦100")
    .max(50_000_000, "Maximum single deposit is ₦50,000,000"),
});

export type DepositNgnInput = z.infer<typeof depositNgnSchema>;

/**
 * Validates an outbound bank withdrawal/payout request.
 */
export const withdrawNgnSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .min(100, "Minimum withdrawal amount is ₦100"),
  bankCode: z
    .string({ error: "Bank code is required" })
    .trim()
    .min(3, "Invalid bank code"),
  accountNumber: z
    .string({ error: "Account number is required" })
    .trim()
    .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  pin: z
    .string({ error: "Security PIN is required" })
    .trim()
    .regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export type WithdrawNgnInput = z.infer<typeof withdrawNgnSchema>;

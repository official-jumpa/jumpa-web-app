import { z } from "zod";

/**
 * Aella individual virtual account creation schema.
 * All biodata (names, DOB, gender) is auto-resolved from NIBSS via the user's BVN.
 */
export const createAellaAccountSchema = z.object({
  bvn: z
    .string({ error: "BVN is required" })
    .trim()
    .regex(/^\d{11}$/, "BVN must be exactly 11 digits"),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .optional(),
});

export type CreateAellaAccountInput = z.infer<typeof createAellaAccountSchema>;

/**
 * Aella bank transfer / payout validation schema.
 */
export const withdrawAellaSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .min(100, "Minimum withdrawal amount is ₦100"),
  accountNumber: z
    .string({ error: "Account number is required" })
    .trim()
    .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  bankName: z
    .string({ error: "Bank name is required" })
    .trim()
    .min(1, "Bank name is required"),
  bankCode: z.string().trim().optional(),
  accountName: z
    .string({ error: "Account name is required" })
    .trim()
    .min(1, "Account name is required"),
  pin: z
    .string({ error: "PIN is required" })
    .trim()
    .min(4, "Transaction PIN must be at least 4 digits"),
  narration: z.string().trim().max(100).optional(),
  sourceProvider: z.literal("aella").default("aella"),
});

export type WithdrawAellaInput = z.infer<typeof withdrawAellaSchema>;

import { z } from "zod";

/**
 * Validation schema for resolving bank accounts via /api/bank/resolve
 */
export const resolveAccountQuerySchema = z.object({
  accountNumber: z
    .string({ error: "Account number is required" })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10, {
      message: "Account number must be exactly 10 digits",
    }),
  bank: z
    .string({ error: "Bank name or code is required" })
    .trim()
    .min(1, "Bank name or code is required"),
});

export type ResolveAccountQueryInput = z.infer<typeof resolveAccountQuerySchema>;

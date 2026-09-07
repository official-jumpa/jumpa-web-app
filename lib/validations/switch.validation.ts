import { z } from "zod";

/**
 * Validation for switch quote (/api/switch/quote)
 */
export const switchQuoteSchema = z.object({
  amount: z
    .union([z.number(), z.string()], {
      error: "amount is required",
    })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "amount must be a positive number",
    }),
  asset: z
    .string({
      error: "asset is required",
    })
    .trim()
    .min(1, "asset is required"),
  direction: z.enum(["onramp", "offramp"]).optional().default("onramp"),
  isExactOut: z.boolean().optional().default(false),
});

export type SwitchQuoteInput = z.infer<typeof switchQuoteSchema>;

/**
 * Validation for switch onramp initiation (/api/switch/onramp)
 */
export const switchOnrampSchema = z.object({
  fiatAmount: z
    .union([z.number(), z.string()], {
      error: "fiatAmount is required",
    })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "fiatAmount must be a positive number",
    }),
  cryptoToken: z.string().trim().optional(),
  asset: z
    .string({
      error: "asset is required",
    })
    .trim()
    .min(1, "asset is required"),
  walletAddress: z
    .string({
      error: "walletAddress is required",
    })
    .trim()
    .min(1, "walletAddress is required"),
  isExactOut: z.boolean().optional().default(false),
});

export type SwitchOnrampInput = z.infer<typeof switchOnrampSchema>;

/**
 * Validation for switch offramp initiation (/api/switch/offramp)
 */
export const switchOfframpSchema = z.object({
  cryptoAmount: z
    .union([z.number(), z.string()], {
      error: "cryptoAmount is required",
    })
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "cryptoAmount must be a positive number",
    }),
  cryptoToken: z.string().trim().optional(),
  asset: z
    .string({
      error: "asset is required",
    })
    .trim()
    .min(1, "asset is required"),
  holderName: z
    .string({
      error: "holderName is required",
    })
    .trim()
    .min(1, "holderName is required"),
  accountNumber: z
    .string({
      error: "accountNumber is required",
    })
    .trim()
    .min(1, "accountNumber is required"),
  bankName: z
    .string({
      error: "bankName is required",
    })
    .trim()
    .min(1, "bankName is required"),
  isExactOut: z.boolean().optional().default(false),
});

export type SwitchOfframpInput = z.infer<typeof switchOfframpSchema>;

/**
 * Validation for switch status checks (/api/switch/status)
 */
export const switchStatusQuerySchema = z.object({
  reference: z
    .string({
      error: "reference is required",
    })
    .trim()
    .min(1, "reference is required"),
});

export type SwitchStatusQueryInput = z.infer<typeof switchStatusQuerySchema>;

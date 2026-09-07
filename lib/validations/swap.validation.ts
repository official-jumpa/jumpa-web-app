import { z } from "zod";
import { pinSchema } from "./user.validation";

/**
 * Validation for swap quote requests (/api/swap/quote)
 */
export const swapQuoteSchema = z.object({
  chain: z.string().trim().optional(),
  assetIn: z
    .string({
      error: "assetIn is required",
    })
    .trim()
    .min(1, "assetIn is required"),
  assetOut: z
    .string({
      error: "assetOut is required",
    })
    .trim()
    .min(1, "assetOut is required"),
  amount: z
    .union([z.string(), z.number()], {
      error: "amount is required",
    })
    .transform((val) => String(val).trim())
    .refine((val) => val.length > 0 && !isNaN(Number(val)) && Number(val) > 0, {
      message: "amount must be a positive number",
    }),
  tradeType: z.string().trim().optional(),
  slippageTolerance: z.number().optional(),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

export type SwapQuoteInput = z.infer<typeof swapQuoteSchema>;

/**
 * Validation for swap transaction building (/api/swap/build)
 */
export const swapBuildSchema = z.object({
  quote: z.any().refine((q) => Boolean(q), { message: "quote is required" }),
  fromAddress: z
    .string({
      error: "fromAddress is required",
    })
    .trim()
    .min(1, "fromAddress is required"),
  toAddress: z.string().trim().optional(),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

export type SwapBuildInput = z.infer<typeof swapBuildSchema>;

/**
 * Validation for swap execution (/api/swap/execute)
 */
export const swapExecuteSchema = z.object({
  pin: pinSchema,
  rawQuote: z.any().refine((q) => Boolean(q), { message: "rawQuote is required" }),
  network: z.enum(["testnet", "mainnet"]).optional(),
  fromToken: z
    .string({
      error: "fromToken is required",
    })
    .trim()
    .min(1, "fromToken is required"),
  toToken: z
    .string({
      error: "toToken is required",
    })
    .trim()
    .min(1, "toToken is required"),
  fromAmount: z
    .string({
      error: "fromAmount is required",
    })
    .trim()
    .min(1, "fromAmount is required"),
  toAmount: z.string().trim().optional(),
});

export type SwapExecuteInput = z.infer<typeof swapExecuteSchema>;

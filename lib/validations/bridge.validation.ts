import { z } from "zod";
import { pinSchema } from "./user.validation";

export const bridgeChains = ["stellar", "base", "ethereum", "solana"] as const;
export type BridgeChainType = (typeof bridgeChains)[number];

/**
 * Validation schema for cross-chain bridge quote requests (/api/v1/bridge/quote)
 */
export const bridgeQuoteSchema = z
  .object({
    fromChain: z.enum(bridgeChains, {
      error: "Unsupported or missing source chain",
    }),
    toChain: z.enum(bridgeChains, {
      error: "Unsupported or missing destination chain",
    }),
    amount: z
      .union([z.string(), z.number()], {
        error: "Please enter an amount to bridge",
      })
      .transform((val) => String(val).trim())
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Please enter a valid amount greater than 0",
      }),
    transferType: z.enum(["fast", "standard"]).default("fast"),
  })
  .refine((data) => data.fromChain !== data.toChain, {
    message: "Source and destination chains cannot be identical",
    path: ["toChain"],
  });

export type BridgeQuoteInput = z.infer<typeof bridgeQuoteSchema>;

/**
 * Validation schema for bridge transaction execution (/api/v1/bridge/execute)
 */
export const bridgeExecuteSchema = z.object({
  pin: pinSchema,
  fromChain: z.enum(bridgeChains, {
    error: "Invalid or unsupported source chain",
  }),
  toChain: z.enum(bridgeChains, {
    error: "Invalid or unsupported destination chain",
  }),
  amount: z
    .union([z.string(), z.number()], {
      error: "Amount is required",
    })
    .transform((val) => String(val).trim())
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Invalid bridge amount",
    }),
  toAmount: z.string().optional(),
  recipientAddress: z
    .string({
      error: "Recipient address is required",
    })
    .trim()
    .min(1, "Recipient address cannot be empty"),
  transferType: z.enum(["fast", "standard"]).default("fast"),
  fee: z.string().default("0.00"),
  networkFee: z.string().optional(),
});

export type BridgeExecuteInput = z.infer<typeof bridgeExecuteSchema>;

/**
 * Validation schema for checking CCTP Iris attestation status (/api/v1/bridge/status)
 */
export const bridgeStatusSchema = z.object({
  domain: z
    .string({
      error: "domain is required",
    })
    .trim()
    .min(1, "domain is required"),
  txHash: z
    .string({
      error: "txHash is required",
    })
    .trim()
    .min(1, "txHash is required"),
});

export type BridgeStatusInput = z.infer<typeof bridgeStatusSchema>;

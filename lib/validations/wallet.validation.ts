import { z } from "zod";
import { pinSchema } from "./user.validation";

/**
 * Validation for /api/wallet/send
 */
export const sendTokenSchema = z.object({
  recipient: z
    .string({
      error: "Recipient address is required",
    })
    .trim()
    .min(1, "Recipient address cannot be empty"),
  amount: z
    .string({
      error: "Amount is required",
    })
    .trim()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  asset: z
    .string({
      error: "Asset symbol is required",
    })
    .trim()
    .toUpperCase(),
  network: z
    .string({
      error: "Network is required",
    })
    .trim()
    .toLowerCase(),
  memo: z.string().trim().max(100, "Memo cannot exceed 100 characters").optional(),
  pin: pinSchema,
});

export type SendTokenInput = z.infer<typeof sendTokenSchema>;

/**
 * Validation for /api/wallet/export-key
 */
export const exportKeySchema = z.object({
  address: z
    .string({
      error: "Wallet address is required",
    })
    .trim()
    .min(1, "Wallet address is required"),
  pin: pinSchema,
  chain: z.string().trim().default("eth"),
});

export type ExportKeyInput = z.infer<typeof exportKeySchema>;


/**
 * Validation for /api/wallet/faucet
 */
export const faucetRequestSchema = z.object({
  chain: z.string().trim().optional(),
  asset: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export type FaucetRequestInput = z.infer<typeof faucetRequestSchema>;

/**
 * Validation for renaming a wallet (PATCH /api/wallet/list)
 */

export const renameWalletSchema = z.object({
  address: z
    .string({
      error: "Address is required",
    })
    .trim()
    .min(1, "Address is required"),
  name: z
    .string({
      error: "New name is required",
    })
    .trim()
    .min(1, "New name cannot be empty")
    .max(30, "Name cannot exceed 30 characters"),
});

export type RenameWalletInput = z.infer<typeof renameWalletSchema>;

/**
 * Validation for selecting a wallet (PUT /api/wallet/list)
 */
export const selectWalletSchema = z.object({
  address: z
    .string({
      error: "Address is required",
    })
    .trim()
    .min(1, "Address is required"),
});

export type SelectWalletInput = z.infer<typeof selectWalletSchema>;



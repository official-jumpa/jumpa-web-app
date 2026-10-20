import { z } from "zod";
import { pinSchema } from "./user.validation";

/**
 * Validation for /api/v1/wallet/send
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
    .trim(),
  memo: z.string().trim().max(100, "Memo cannot exceed 100 characters").optional(),
  pin: pinSchema,
});

export type SendTokenInput = z.infer<typeof sendTokenSchema>;

/**
 * Validation for /api/v1/wallet/export
 */
export const exportKeySchema = z.object({
  address: z.string().trim().optional(),
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

/**
 * Validation for /api/v1/wallet/pin?action=update
 */
export const changePinSchema = z
  .object({
    newPin: z.string({ error: "New PIN is required" }).trim(),
    currentPin: z.string().trim().optional(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Verification code must be 6 digits.")
      .optional(),
    kind: z
      .enum(["transaction", "login"], {
        error: "Kind must be either 'transaction' or 'login'",
      })
      .default("transaction"),
  })
  .superRefine((data, ctx) => {
    const isLogin = data.kind === "login";
    const expectedLen = isLogin ? 6 : 4;
    const pinRegex = isLogin ? /^\d{6}$/ : /^\d{4}$/;
    const label = isLogin ? "Login PIN" : "Transaction PIN";

    if (!pinRegex.test(data.newPin)) {
      ctx.addIssue({
        code: "custom",
        path: ["newPin"],
        message: `${label} must be ${expectedLen} digits.`,
      });
    }

    if (data.currentPin && !pinRegex.test(data.currentPin)) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPin"],
        message: `Current ${label} must be ${expectedLen} digits.`,
      });
    }

    if (!data.currentPin && !data.otp) {
      ctx.addIssue({
        code: "custom",
        path: ["otp"],
        message: "Verification code is required to reset PIN.",
      });
    }
  });

export type ChangePinInput = z.infer<typeof changePinSchema>;



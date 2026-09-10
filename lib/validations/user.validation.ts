import { z } from "zod";
import { TRANSACTION_PIN_LENGTH } from "@/lib/pin";

/**
 * Validates the numeric transaction PIN. Its length lives in `lib/pin.ts` —
 * the login PIN is a different length and must not be validated by this.
 */
export const pinSchema = z
  .string({
    error: "PIN is required",
  })
  .regex(
    new RegExp(`^\\d{${TRANSACTION_PIN_LENGTH}}$`),
    `PIN must be exactly ${TRANSACTION_PIN_LENGTH} digits`,
  );

/**
 * Validation for /api/wallet/verify-pin.
 */
export const verifyPinSchema = z.object({
  pin: pinSchema,
  address: z.string().trim().optional(),
  action: z.string().trim().optional(),
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

/**
 * Validation for /api/auth/wallet-setup.
 */
export const walletSetupSchema = z
  .object({
    pin: pinSchema,
    phrase: z.string().trim().optional(),
    privateKey: z.string().trim().optional(),
    chain: z.enum(["stellar", "solana", "base", "eth"]).optional(),
    action: z.enum(["create", "import"]).optional().default("create"),
  })
  .refine(
    (data) => {
      if (data.action === "import") {
        return Boolean(data.phrase || data.privateKey);
      }
      return true;
    },
    {
      message: "Either seed phrase or private key is required for wallet import",
      path: ["phrase"],
    },
  );

export type WalletSetupInput = z.infer<typeof walletSetupSchema>;

/**
 * Validation for updating user profile settings.
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Name cannot be empty").max(50, "Name cannot exceed 50 characters").optional(),
  jumpaTag: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "Jumpa tag must be 3 to 20 alphanumeric characters or underscores")
    .optional(),
  country: z.string().trim().length(2, "Country code must be a 2-letter ISO code").optional(),
  image: z.string().url("Image must be a valid URL").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Validation for account deletion requests.
 */
export const deleteAccountSchema = z.object({
  confirmation: z.string().optional(),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
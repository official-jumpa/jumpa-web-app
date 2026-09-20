import { z } from "zod";

/**
 * Validates a 4-digit numeric transaction PIN.
 */
export const pinSchema = z
  .string({
    error: "PIN is required",
  })
  .regex(/^\d{4}$/, "PIN must be exactly 4 digits");

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
  nickname: z
    .string()
    .trim()
    .min(1, "Nickname cannot be empty")
    .max(30, "Nickname cannot exceed 30 characters")
    .optional(),
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
 * Validation for updating user nickname.
 */
export const updateNicknameSchema = z.object({
  nickname: z
    .string({ error: "Nickname is required" })
    .trim()
    .min(1, "Enter a nickname")
    .max(30, "Keep it within 30 characters"),
});

export type UpdateNicknameInput = z.infer<typeof updateNicknameSchema>;

/**
 * Validation for account deletion requests.
 */
export const deleteAccountSchema = z.object({
  confirmation: z.string().optional(),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** Detect weak 6-digit passwords (repeated digits or consecutive sequences) */
export function isWeakPassword(value: string): boolean {
  if (/^(\d)\1+$/.test(value)) return true;
  const digits = value.split("").map(Number);
  let isAsc = true;
  let isDesc = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) isAsc = false;
    if (digits[i] !== digits[i - 1] - 1) isDesc = false;
  }
  return isAsc || isDesc;
}

/**
 * Validation for setting login password (POST /api/auth/wallet-setup?step=password)
 */
export const setLoginPasswordSchema = z.object({
  password: z
    .string({ error: "Password must be exactly 6 digits" })
    .trim()
    .regex(/^\d{6}$/, "Password must be exactly 6 digits")
    .refine(
      (val) => !isWeakPassword(val),
      "Avoid sequences and repeated digits. Pick another password.",
    ),
});

export type SetLoginPasswordInput = z.infer<typeof setLoginPasswordSchema>;

/**
 * Validation for setting unique Jumpa tag (POST /api/auth/wallet-setup?step=tag)
 */
export const setJumpaTagSchema = z.object({
  tag: z
    .string({ error: "Jumpa tag is required" })
    .trim()
    .transform((v) =>
      v
        .replace(/^@+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20),
    )
    .refine((v) => v.length >= 3, {
      message: "Jumpa tag must be at least 3 characters",
    }),
});

export type SetJumpaTagInput = z.infer<typeof setJumpaTagSchema>;

/**
 * Validation for checking Jumpa tag availability (GET /api/auth/wallet-setup?checkTag=)
 */
export const checkTagQuerySchema = z.object({
  checkTag: z
    .string()
    .trim()
    .transform((v) =>
      v
        .replace(/^@+/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20),
    )
    .refine((v) => v.length >= 3, {
      message: "Jumpa tag must be at least 3 characters",
    }),
});

export type CheckTagQueryInput = z.infer<typeof checkTagQuerySchema>;

/**
 * Validation for PIN migration (POST /api/auth/wallet-setup?step=migrate-pin)
 */
export const migratePinSchema = z
  .object({
    action: z
      .enum(["validate-current", "verify-current", "confirm-existing", "standard"])
      .default("standard"),
    oldPin: z.string().trim().optional(),
    newPin: z.string().trim().optional(),
    pin: z.string().trim().optional(),
    existing4DigitPin: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "validate-current" || data.action === "verify-current") {
      if (!data.oldPin || !/^\d{6}$/.test(data.oldPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Current PIN must be exactly 6 digits",
          path: ["oldPin"],
        });
      }
    } else if (data.action === "confirm-existing") {
      const pinCandidate = data.existing4DigitPin || data.pin || data.oldPin;
      if (!pinCandidate || !/^\d{4}$/.test(pinCandidate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PIN must be exactly 4 digits",
          path: ["pin"],
        });
      }
    } else {
      // standard migration
      if (!data.oldPin || !/^\d{6}$/.test(data.oldPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Current PIN must be exactly 6 digits",
          path: ["oldPin"],
        });
      }
      if (!data.newPin || !/^\d{4}$/.test(data.newPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New PIN must be exactly 4 digits",
          path: ["newPin"],
        });
      } else if (isWeakPassword(data.newPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Avoid sequences and repeated digits for your new PIN.",
          path: ["newPin"],
        });
      }
    }
  });

export type MigratePinInput = z.infer<typeof migratePinSchema>;

/**
 * Validation for revoking sessions (DELETE /api/auth/sessions)
 */
export const deleteSessionQuerySchema = z
  .object({
    target: z.enum(["others"]).optional(),
    id: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.target === "others" || data.id), {
    message: "Provide either ?target=others or ?id=<sessionId>",
  });

export type DeleteSessionQueryInput = z.infer<typeof deleteSessionQuerySchema>;
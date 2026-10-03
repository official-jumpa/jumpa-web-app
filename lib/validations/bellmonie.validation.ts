import { z } from "zod";

/**
 * Bellmonie individual virtual account creation schema.
 * Matches Bellmonie API: POST /v1/account/clients/individual
 */
export const createBellmonieAccountSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .trim()
    .min(1, "First name is required"),
  lastName: z
    .string({ error: "Last name is required" })
    .trim()
    .min(1, "Last name is required"),
  middleName: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  phoneNumber: z
    .string({ error: "Phone number is required" })
    .trim()
    .min(7, "Phone number is invalid"),
  emailAddress: z
    .string({ error: "Email address is required" })
    .trim()
    .email("Invalid email address"),
  address: z
    .string({ error: "Address is required" })
    .trim()
    .min(3, "Address must be at least 3 characters"),
  bvn: z
    .string({ error: "BVN is required" })
    .trim()
    .regex(/^\d{11}$/, "BVN must be exactly 11 digits"),
  nin: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "NIN must be an 11-digit number")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  gender: z
    .enum(["male", "female"], {
      error: "Gender is required (male or female)",
    })
    .default("male"),
  dateOfBirth: z
    .string({ error: "Date of birth is required" })
    .trim()
    .regex(
      /^\d{4}[-/]\d{2}[-/]\d{2}$/,
      "Date of birth must be in YYYY-MM-DD or YYYY/MM/DD format",
    ),
});

export type CreateBellmonieAccountInput = z.infer<
  typeof createBellmonieAccountSchema
>;

/**
 * Bellmonie bank transfer / payout validation schema.
 */
export const withdrawBellmonieSchema = z.object({
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
  sourceProvider: z.literal("bellmonie").default("bellmonie"),
});

export type WithdrawBellmonieInput = z.infer<typeof withdrawBellmonieSchema>;

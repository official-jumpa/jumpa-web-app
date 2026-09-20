import { z } from "zod";

/**
 * Strict name regex matching FossaPay rules:
 * - Single name only (no spaces)
 * - Unicode letters and combining marks
 * - Hyphens and apostrophes allowed to join parts (e.g. Mary-Anne, O'Connor)
 * - Numbers and other punctuation rejected
 */
export const FOSSAPAY_NAME_REGEX = /^[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*$/u;

/**
 * Checks that the provided YYYY-MM-DD date corresponds to a person at least 16 years old.
 */
export function isAtLeast16YearsOld(dobString: string): boolean {
  const parts = dobString.split("-").map(Number);
  if (parts.length !== 3) return false;
  const [year, month, day] = parts;
  if (!year || !month || !day) return false;

  const dob = new Date(year, month - 1, day);
  // Verify date components match (avoids invalid dates like Feb 31)
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 16;
}

/**
 * FossaPay account registration schema.
 */
export const createNgnAccountSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .trim()
    .min(1, "First name is required")
    .regex(
      FOSSAPAY_NAME_REGEX,
      "First name must be a single name with letters only (no spaces, numbers, or symbols)"
    ),
  middleName: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || FOSSAPAY_NAME_REGEX.test(val),
      "Middle name must be a single name with letters only (no spaces, numbers, or symbols)"
    )
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  lastName: z
    .string({ error: "Last name is required" })
    .trim()
    .min(1, "Last name is required")
    .regex(
      FOSSAPAY_NAME_REGEX,
      "Last name must be a single name with letters only (no spaces, numbers, or symbols)"
    ),
  dateOfBirth: z
    .string({ error: "Date of birth is required" })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .refine(isAtLeast16YearsOld, "You must be at least 16 years old to open an NGN account"),
  mobileNumber: z
    .string({ error: "Mobile number is required" })
    .trim()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Mobile number must be in international format with country code (e.g. +2348012345678)"
    ),
  address: z
    .string({ error: "Residential address is required" })
    .trim()
    .min(3, "Address must be at least 3 characters")
    .max(200, "Address cannot exceed 200 characters"),
  city: z
    .string({ error: "City is required" })
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100, "City cannot exceed 100 characters"),
});

/**
 * FossaPay account registration input type.
 */
export type CreateNgnAccountInput = z.infer<typeof createNgnAccountSchema>;

/**
 * Validation schema for NGN wallet withdrawals (P2P & Inter-Bank).
 */
export const withdrawNgnSchema = z.object({
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
});

export type WithdrawNgnInput = z.infer<typeof withdrawNgnSchema>;

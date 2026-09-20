import { z } from "zod";

/**
 * Normalizes any valid Nigerian phone number representation to 11 digits standard (08012345678).
 * Handles:
 * - 08012345678 (standard 11 digits)
 * - 8012345678 (10 digits without leading 0)
 * - +2348012345678 or 2348012345678 (international prefix)
 */
export function normalizeNigerianPhone(input: string): string {
  if (!input) return "";
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return "0" + cleaned.slice(3);
  }
  if (cleaned.length === 10 && /^[789][01]\d{8}$/.test(cleaned)) {
    return "0" + cleaned;
  }
  return cleaned;
}

/**
 * Validates if a string represents a valid Nigerian mobile phone number.
 */
export function isValidNigerianPhone(input: string): boolean {
  if (!input) return false;
  const normalized = normalizeNigerianPhone(input);
  return /^0[789][01]\d{8}$/.test(normalized);
}

/**
 * Standard Nigerian phone number regex allowing optional +234, 234, or 0 prefix.
 */
export const nigerianPhoneRegex = /^(?:(?:\+?234)|0)?[789][01]\d{8}$/;

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .refine(isValidNigerianPhone, {
    message: "Enter a valid Nigerian phone number (e.g. 08031234567 or 8031234567)",
  })
  .transform(normalizeNigerianPhone);

export const buyAirtimeSchema = z.object({
  phone: nigerianPhoneSchema,
  amount: z
    .number()
    .min(50, "Minimum recharge amount is ₦50")
    .max(200000, "Maximum recharge amount is ₦200,000"),
  network: z.enum(["mtn", "airtel", "glo", "9mobile"]).optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export const getDataPlansQuerySchema = z.object({
  phone: nigerianPhoneSchema,
});

export const buyDataSchema = z.object({
  phone: nigerianPhoneSchema,
  productName: z.string().trim().min(3, "Valid product name is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  packageSize: z.string().optional(),
  validity: z.string().optional(),
  network: z.enum(["mtn", "airtel", "glo", "9mobile"]).optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export type BuyAirtimeInput = z.infer<typeof buyAirtimeSchema>;
export type GetDataPlansQueryInput = z.infer<typeof getDataPlansQuerySchema>;
export type BuyDataInput = z.infer<typeof buyDataSchema>;


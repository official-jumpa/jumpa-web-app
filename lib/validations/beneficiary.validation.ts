import { z } from "zod";

/**
 * Query schema for GET /api/beneficiaries
 */
export const listBeneficiariesQuerySchema = z.object({
  type: z.enum(["bank", "wallet", "jumpa", "momo"]).optional(),
});

/**
 * Query schema for DELETE /api/beneficiaries
 */
export const deleteBeneficiaryQuerySchema = z.object({
  id: z
    .string({ error: "Beneficiary ID is required" })
    .trim()
    .min(1, "Beneficiary ID is required"),
});

export type ListBeneficiariesQueryInput = z.infer<
  typeof listBeneficiariesQuerySchema
>;
export type DeleteBeneficiaryQueryInput = z.infer<
  typeof deleteBeneficiaryQuerySchema
>;

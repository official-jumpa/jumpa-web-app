import { z } from "zod";

export const beneficiaryTypeSchema = z.enum(["bank", "wallet", "jumpa", "momo"]);

/**
 * Query schema for GET /api/v1/beneficiaries
 */
export const listBeneficiariesQuerySchema = z.object({
  type: beneficiaryTypeSchema.optional(),
  view: z.enum(["saved", "recent", "all"]).optional().default("saved"),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type ListBeneficiariesQueryInput = z.infer<
  typeof listBeneficiariesQuerySchema
>;

/**
 * Body schema for POST /api/v1/beneficiaries (Save a new beneficiary)
 */
export const createBeneficiarySchema = z.object({
  type: beneficiaryTypeSchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  identifier: z.string().trim().min(1, "Identifier is required"),
  details: z.record(z.string(), z.any()).optional().default({}),
  isFavorite: z.boolean().optional().default(false),
});

export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;

/**
 * Body schema for PATCH /api/v1/beneficiaries (Edit beneficiary name / toggle favorite)
 */
export const updateBeneficiarySchema = z
  .object({
    id: z.string().trim().min(1, "Beneficiary ID is required"),
    name: z.string().trim().min(1).max(100).optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.isFavorite !== undefined,
    { message: "Either 'name' or 'isFavorite' must be provided" },
  );

export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;

/**
 * Query schema for DELETE /api/v1/beneficiaries?id=<beneficiary_id>
 */
export const deleteBeneficiaryQuerySchema = z.object({
  id: z
    .string({ error: "Beneficiary ID is required" })
    .trim()
    .min(1, "Beneficiary ID is required"),
});

export type DeleteBeneficiaryQueryInput = z.infer<
  typeof deleteBeneficiaryQuerySchema
>;

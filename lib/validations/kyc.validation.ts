import { z } from "zod";

export const kycVerifySchema = z.object({
  idType: z.enum(["nin", "licence", "passport"]),
  idNumber: z
    .string()
    .min(1, "Document or identification number is required")
    .trim(),
  docMediaId: z.string().min(1, "Document front photo is required"),
  selfieMediaId: z.string().min(1, "Selfie photo is required"),
  userData: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
});

export const kycStageSchema = z.object({
  stage: z.enum([
    "intro",
    "tasks",
    "doc-select",
    "document",
    "selfie",
    "verifying",
    "completed",
    "failed",
  ]),
  currentStep: z.number().int().min(1).max(6).optional(),
});

export type KycVerifyInput = z.infer<typeof kycVerifySchema>;
export type KycStageInput = z.infer<typeof kycStageSchema>;

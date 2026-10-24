import { z } from "zod";

export const kycVerifySchema = z
  .object({
    idType: z.enum(["nin", "licence", "passport"]),
    idNumber: z
      .string()
      .min(1, "Document or identification number is required")
      .trim(),
    docMediaId: z.string().optional().nullable(),
    docBackMediaId: z.string().optional().nullable(),
    selfieMediaId: z.string().min(1, "Selfie photo is required"),
    userData: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.idType !== "nin" && !data.docMediaId) {
      ctx.addIssue({
        code: "custom",
        path: ["docMediaId"],
        message:
          "Document photo is required for Driver's License and Passport verification",
      });
    }
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

export const verifyPhoneActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    phone: z.string().trim().min(7, "Please enter your phone number").max(20),
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().trim().min(7, "Phone number is required").max(20),
    code: z.string().trim().min(4, "Verification code is required").max(10),
    challengeId: z.string().trim().min(1, "Challenge ID is required"),
  }),
  z.object({
    action: z.literal("skip"),
    phone: z.string().trim().max(20).optional().nullable(),
  }),
  z.object({
    action: z.literal("reset-skip"),
  }),
]);

export type VerifyPhoneActionInput = z.infer<typeof verifyPhoneActionSchema>;


import { z } from "zod";

export const statementRequestSchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    currency: z.enum(["all", "crypto", "fiat"]).default("all"),
    homeAddress: z.string().max(200).optional(),
    pin: z
      .string()
      .length(4, "PIN must be 4 digits")
      .regex(/^\d+$/, "PIN must be numeric")
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.from);
      const end = new Date(data.to);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
    },
    {
      message: "End date cannot be earlier than start date",
      path: ["to"],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.from);
      const end = new Date(data.to);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 92; // Max 3 months (92 days)
    },
    {
      message: "Statement period cannot exceed 3 months (92 days)",
      path: ["to"],
    },
  );

export type StatementRequestInput = z.infer<typeof statementRequestSchema>;

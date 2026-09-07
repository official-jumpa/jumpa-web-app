import { z } from "zod";

export const transactionQuerySchema = z.object({
  type: z.string().trim().optional(),
  status: z.string().trim().optional(),
  chain: z.string().trim().optional(),
  network: z.string().trim().optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => Math.max(1, parseInt(String(val || "1"), 10))),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => Math.min(100, Math.max(1, parseInt(String(val || "20"), 10)))),
  duration: z.string().trim().optional(),
  card: z.string().trim().optional(),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

import { z } from "zod";

export const centiivQuoteSchema = z.object({
  fromAsset: z.string(),
  toAsset: z.string(),
  amount: z.number().positive(),
  network: z.string().optional().default("STELLAR"),
});

export type CentiivQuoteInput = z.infer<typeof centiivQuoteSchema>;

export const centiivOfframpSchema = z.object({
  amount: z.number().positive(),
  refundAddress: z.string().optional(),
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  userId: z.string(),
});

export type CentiivOfframpInput = z.infer<typeof centiivOfframpSchema>;

export const centiivOnrampSchema = z.object({
  fiatAmount: z.number().positive(),
  destinationAddress: z.string(),
  senderName: z.string().optional().default("Jumpa User"),
  senderEmail: z.string().email().optional().default("user@jumpa.cash"),
  senderPhone: z.string().optional().default("0000000000"),
  userId: z.string(),
});

export type CentiivOnrampInput = z.infer<typeof centiivOnrampSchema>;

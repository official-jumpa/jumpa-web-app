import { z } from "zod";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS } from "@/lib/chat-attachments";
import { MESSAGE_MAX, TICKET_CATEGORIES } from "@/lib/support-tickets";

/** An upload from POST /api/chat/attachments, echoed back as-is. */
export const supportAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(64),
  url: z.url({ protocol: /^https$/ }).max(2048),
  name: z.string().trim().min(1).max(200).default("attachment"),
  mime: z.string().trim().max(120).default("application/octet-stream"),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_BYTES).default(0),
});

const messageFields = {
  text: z.string().trim().max(MESSAGE_MAX).default(""),
  attachments: z
    .array(supportAttachmentSchema)
    .max(MAX_ATTACHMENTS)
    .default([]),
  transactionId: z.string().trim().min(1).max(64).nullish(),
};

const hasContent = (body: {
  text: string;
  attachments: unknown[];
  transactionId?: string | null;
}) =>
  body.text.length > 0 || body.attachments.length > 0 || !!body.transactionId;

const CONTENT_REQUIRED = {
  message: "Write a message, attach a file or share a transaction",
  path: ["text"],
};

/** POST /api/support/tickets — a new conversation, opened by its first message. */
export const createTicketSchema = z
  .object({ ...messageFields, category: z.enum(TICKET_CATEGORIES).nullish() })
  .refine(hasContent, CONTENT_REQUIRED);

/** POST /api/support/tickets/:id */
export const ticketActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("message"), ...messageFields })
    .refine(hasContent, CONTENT_REQUIRED),
  z.object({ action: z.literal("escalate") }),
  z.object({
    action: z.literal("rate"),
    score: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).nullish(),
  }),
]);

export type TicketActionInput = z.infer<typeof ticketActionSchema>;

/** `?since=` on a thread poll: an ISO instant from the previous `cursor`. */
export const sinceSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullish()
  .catch(null);

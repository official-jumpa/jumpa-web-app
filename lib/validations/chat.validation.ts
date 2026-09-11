import { z } from "zod";
import { MAX_ATTACHMENTS } from "@/lib/chat-attachments";
import { pinSchema } from "./user.validation";

/**
 * Validation for sending a message (/api/chat/send)
 */
export const sendMessageSchema = z
  .object({
    sessionId: z.string().trim().optional(),
    message: z.string().trim().default(""),
    /**
     * Ids from /api/chat/attachments. Only the id is trusted — the name, type
     * and size are read back from storage, never from the request body.
     */
    attachmentIds: z
      .array(z.string().trim().min(1))
      .max(MAX_ATTACHMENTS)
      .optional(),
  })
  // A file on its own is a message, so the text is only required without one.
  .refine(
    (body) => body.message.length > 0 || (body.attachmentIds?.length ?? 0) > 0,
    { message: "Message content is required", path: ["message"] },
  );

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Validation for confirming a pending chat transaction (/api/chat/confirm)
 */
export const confirmChatActionSchema = z.object({
  sessionId: z
    .string({
      error: "Session ID is required",
    })
    .trim()
    .min(1, "Session ID is required"),
  messageId: z.string().trim().optional(),
  pin: pinSchema,
  updatedCardData: z.record(z.string(), z.any()).optional(),
  updatedParams: z.record(z.string(), z.any()).optional(),
});

export type ConfirmChatActionInput = z.infer<typeof confirmChatActionSchema>;

/**
 * Validation for cancelling a pending chat action (/api/chat/cancel)
 */
export const cancelChatActionSchema = z.object({
  sessionId: z
    .string({
      error: "Session ID is required",
    })
    .trim()
    .min(1, "Session ID is required"),
  messageId: z.string().trim().optional(),
});

export type CancelChatActionInput = z.infer<typeof cancelChatActionSchema>;

/**
 * Validation for chat history queries (/api/chat/history)
 */
export const chatHistoryQuerySchema = z.object({
  sessionId: z.string().trim().optional(),
  latest: z.union([z.string(), z.boolean()]).optional(),
  list: z.union([z.string(), z.boolean()]).optional(),
  all: z.union([z.string(), z.boolean()]).optional(),
});

export type ChatHistoryQueryInput = z.infer<typeof chatHistoryQuerySchema>;

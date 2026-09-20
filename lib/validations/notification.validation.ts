import { z } from "zod";

/**
 * Query schema for GET /api/notifications
 */
export const listNotificationsQuerySchema = z.object({
  tab: z.enum(["transactions", "activities"]).optional(),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30))
    .pipe(z.number().min(1).max(100)),
  skip: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .pipe(z.number().min(0)),
});

/**
 * Query schema for PATCH /api/notifications
 */
export const updateNotificationQuerySchema = z
  .object({
    id: z.string().trim().optional(),
    action: z.enum(["read-all"]).optional(),
    tab: z.enum(["transactions", "activities"]).optional(),
    readAll: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.id || data.action === "read-all" || data.readAll === "true"),
    { message: "Provide either ?id=<notificationId> or ?action=read-all" },
  );

export const notificationTypeEnum = z.enum([
  "FUNDS_RECEIVED",
  "TRANSFER_SENT",
  "ONRAMP_INITIATED",
  "ONRAMP_COMPLETED",
  "OFFRAMP_INITIATED",
  "OFFRAMP_COMPLETED",
  "WITHDRAWAL_INITIATED",
  "WITHDRAWAL_COMPLETED",
  "SWAP_COMPLETED",
  "FAUCET_CLAIMED",
  "LOGIN",
  "PIN_CHANGED",
  "PIN_MIGRATED",
  "JUMPA_TAG_SET",
  "WALLET_CREATED",
  "WALLET_IMPORTED",
  "SECURITY_ALERT",
]);

/**
 * Body schema for POST /api/notifications
 */
export const createNotificationSchema = z.object({
  tab: z.enum(["transactions", "activities"], {
    error: "Tab must be 'transactions' or 'activities'",
  }),
  type: notificationTypeEnum,
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title cannot be empty")
    .max(100),
  body: z
    .string({ error: "Body is required" })
    .trim()
    .min(1, "Body cannot be empty")
    .max(500),
  metadata: z.record(z.string(), z.any()).optional(),
  link: z.string().trim().optional(),
});

export type ListNotificationsQueryInput = z.infer<
  typeof listNotificationsQuerySchema
>;
export type UpdateNotificationQueryInput = z.infer<
  typeof updateNotificationQuerySchema
>;
export type CreateNotificationInput = z.infer<
  typeof createNotificationSchema
>;

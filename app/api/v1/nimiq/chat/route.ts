import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
} from "@/lib/nimiq/api";
import { answerChat } from "@/lib/nimiq/chat-agent";
import { isStoredFile, withAttachments } from "@/lib/nimiq/chat-media";

/** Messages sent back with each question; the device keeps the rest. */
const MAX_TURNS = 12;

const attachment = z.object({
  id: z.string().max(100),
  url: z.string().url().max(500).refine(isStoredFile, "Unknown file."),
  name: z.string().max(200),
  mime: z.string().max(100),
  size: z.number().nonnegative(),
});

const schema = z.object({
  address: addressField,
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().max(1000),
          attachments: z.array(attachment).max(4).optional(),
        })
        .refine(
          (turn) => turn.content || turn.attachments?.length,
          "Type a message.",
        ),
    )
    .min(1, "Type a message.")
    .max(MAX_TURNS)
    .refine((messages) => messages.at(-1)?.role === "user", "Type a message."),
});

/** Answers the mini app's chat; actions come back as a screen to open, never a payment. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, {
    action: "chat",
    perMinute: 10,
    perDay: 200,
  });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    const { messages } = input.data;
    // Photos are only read on the newest turn; older ones are just named.
    const turns = await Promise.all(
      messages.map(async ({ role, content, attachments }, index) => ({
        role,
        content: await withAttachments(
          content,
          attachments,
          index === messages.length - 1,
        ),
      })),
    );
    return ok(await answerChat(input.data.address, turns));
  } catch (error) {
    return handleError(error, "chat");
  }
}

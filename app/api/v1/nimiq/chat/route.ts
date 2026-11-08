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

/** Messages sent back with each question; the device keeps the rest. */
const MAX_TURNS = 12;

const schema = z.object({
  address: addressField,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      }),
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
    return ok(await answerChat(input.data.address, input.data.messages));
  } catch (error) {
    return handleError(error, "chat");
  }
}

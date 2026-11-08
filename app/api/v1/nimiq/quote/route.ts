import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
} from "@/lib/nimiq/api";
import { getQuote } from "@/lib/nimiq/orders";

const schema = z.object({
  direction: z.enum(["cash_out", "top_up"], {
    error: "Choose cash-out or top-up.",
  }),
  amount: z.coerce
    .number({ error: "Enter an amount." })
    .positive("Enter an amount greater than 0.")
    .max(100_000_000, "Enter a smaller amount."),
});

/** Live Switch quote: USDT → Naira for a cash-out, Naira → USDT for a top-up. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, { action: "quote", perMinute: 30 });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok(await getQuote(input.data.direction, input.data.amount));
  } catch (error) {
    return handleError(error, "quote");
  }
}

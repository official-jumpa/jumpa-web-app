import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
  recipientField,
} from "@/lib/nimiq/api";
import { createTopUpOrder } from "@/lib/nimiq/orders";

const schema = z.object({
  address: addressField,
  amountNgn: z.coerce
    .number({ error: "Enter an amount." })
    .int("Enter a whole Naira amount.")
    .positive("Enter an amount greater than 0.")
    .max(100_000_000, "Enter a smaller amount."),
  recipient: recipientField.optional(),
});

/** Opens a Switch top-up paying USDT on Polygon to the connected wallet, or to `recipient`. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, { action: "top_up", perMinute: 6 });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok({ order: await createTopUpOrder(input.data) });
  } catch (error) {
    return handleError(error, "top-up create");
  }
}

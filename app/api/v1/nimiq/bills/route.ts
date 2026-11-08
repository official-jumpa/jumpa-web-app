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
import { createBillOrder } from "@/lib/nimiq/orders";

const recipient = {
  address: addressField,
  phone: z.string({ error: "Enter the phone number." }).trim().max(20),
  network: z.string({ error: "Choose the network." }).trim().max(20),
};

const schema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      ...recipient,
      kind: z.literal("airtime"),
      amountNgn: z.coerce.number({ error: "Enter an amount." }),
    }),
    z.object({
      ...recipient,
      kind: z.literal("data"),
      productName: z
        .string({ error: "Choose a bundle." })
        .trim()
        .min(1, "Choose a bundle.")
        .max(200),
    }),
  ],
  { error: "Choose airtime or data." },
);

/** Prices airtime or a data bundle in USDT and returns the permit for Nimiq Pay to sign. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, { action: "bill", perMinute: 6 });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok(await createBillOrder(input.data));
  } catch (error) {
    return handleError(error, "bill create");
  }
}

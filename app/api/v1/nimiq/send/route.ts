import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
  usdtAmountField,
} from "@/lib/nimiq/api";
import { createSendOrder } from "@/lib/nimiq/orders";

const schema = z.object({
  address: addressField,
  to: addressField,
  amount: usdtAmountField,
});

/** Opens a USDT transfer to another Polygon wallet and returns the permit for Nimiq Pay to sign. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, { action: "send", perMinute: 6 });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok(await createSendOrder(input.data));
  } catch (error) {
    return handleError(error, "send create");
  }
}

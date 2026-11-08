import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  accountNumberField,
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
  readJson,
  usdtAmountField,
} from "@/lib/nimiq/api";
import { createCashOutOrder } from "@/lib/nimiq/orders";

const schema = z.object({
  address: addressField,
  amount: usdtAmountField,
  bank: z
    .string({ error: "Choose a bank." })
    .trim()
    .min(1, "Choose a bank.")
    .max(80),
  accountNumber: accountNumberField,
});

/** Opens a cash-out with Switch and returns the permit for Nimiq Pay to sign. */
export async function POST(req: NextRequest) {
  const stop = await guardRequest(req, { action: "cash_out", perMinute: 6 });
  if (stop) return stop;

  const input = parse(schema, await readJson(req));
  if (input.response) return input.response;

  try {
    return ok(await createCashOutOrder(input.data));
  } catch (error) {
    return handleError(error, "cash-out create");
  }
}

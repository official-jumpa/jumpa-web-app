import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  guardRequest,
  handleError,
  ok,
  orderIdField,
  parse,
  readJson,
} from "@/lib/nimiq/api";
import { SIGNATURE_PATTERN } from "@/lib/nimiq/constants";
import { submitBillSignature } from "@/lib/nimiq/orders";

const schema = z.object({
  orderId: orderIdField,
  signature: z
    .string({ error: "Approve the purchase in Nimiq Pay first." })
    .regex(SIGNATURE_PATTERN, "That signature isn't valid."),
});

/** Relays the signed permit, then buys the airtime or data once the USDT arrives. */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/v1/nimiq/bills/[orderId]/submit">,
) {
  const stop = await guardRequest(req, {
    action: "bill_submit",
    perMinute: 6,
  });
  if (stop) return stop;

  const body = (await readJson(req)) as { signature?: unknown };
  const input = parse(schema, {
    orderId: (await ctx.params).orderId,
    signature: body?.signature,
  });
  if (input.response) return input.response;

  try {
    const order = await submitBillSignature(
      input.data.orderId,
      input.data.signature as `0x${string}`,
    );
    return ok({ order });
  } catch (error) {
    return handleError(error, "bill submit");
  }
}

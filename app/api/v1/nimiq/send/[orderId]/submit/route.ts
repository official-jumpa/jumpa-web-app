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
import { submitSendSignature } from "@/lib/nimiq/orders";

const schema = z.object({
  orderId: orderIdField,
  signature: z
    .string({ error: "Approve the transfer in Nimiq Pay first." })
    .regex(SIGNATURE_PATTERN, "That signature isn't valid."),
});

/** Relays the signed permit: Jumpa pays the gas and moves the USDT to the recipient. */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/v1/nimiq/send/[orderId]/submit">,
) {
  // Jumpa pays the gas on every send, so the day cap keeps one sender from draining it.
  const stop = await guardRequest(req, {
    action: "send_submit",
    perMinute: 6,
    perDay: 30,
  });
  if (stop) return stop;

  const body = (await readJson(req)) as { signature?: unknown };
  const input = parse(schema, {
    orderId: (await ctx.params).orderId,
    signature: body?.signature,
  });
  if (input.response) return input.response;

  try {
    const order = await submitSendSignature(
      input.data.orderId,
      input.data.signature as `0x${string}`,
    );
    return ok({ order });
  } catch (error) {
    return handleError(error, "send submit");
  }
}

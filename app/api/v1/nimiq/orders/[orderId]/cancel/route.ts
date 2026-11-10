import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  orderIdField,
  parse,
  readJson,
} from "@/lib/nimiq/api";
import { cancelTopUp } from "@/lib/nimiq/orders";

const schema = z.object({ orderId: orderIdField, address: addressField });

/** Cancels an unpaid top-up for the wallet that opened it. */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/v1/nimiq/orders/[orderId]/cancel">,
) {
  const stop = await guardRequest(req, {
    action: "order_cancel",
    perMinute: 10,
  });
  if (stop) return stop;

  const body = (await readJson(req)) as { address?: unknown };
  const input = parse(schema, {
    orderId: (await ctx.params).orderId,
    address: body?.address,
  });
  if (input.response) return input.response;

  try {
    return ok({
      order: await cancelTopUp(input.data.orderId, input.data.address),
    });
  } catch (error) {
    return handleError(error, "order cancel");
  }
}

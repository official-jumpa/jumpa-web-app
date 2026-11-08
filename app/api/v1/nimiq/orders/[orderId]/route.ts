import type { NextRequest } from "next/server";
import {
  guardRequest,
  handleError,
  ok,
  orderIdField,
  parse,
} from "@/lib/nimiq/api";
import { refreshOrder } from "@/lib/nimiq/orders";

/** An order's latest state; settles it from Polygon or Switch when it is not final. */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/v1/nimiq/orders/[orderId]">,
) {
  const stop = await guardRequest(req, { action: "order", perMinute: 60 });
  if (stop) return stop;

  const input = parse(orderIdField, (await ctx.params).orderId);
  if (input.response) return input.response;

  try {
    return ok({ order: await refreshOrder(input.data) });
  } catch (error) {
    return handleError(error, "order refresh");
  }
}

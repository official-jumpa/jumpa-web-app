import type { NextRequest } from "next/server";
import {
  guardRequest,
  handleError,
  ok,
  orderIdsField,
  parse,
} from "@/lib/nimiq/api";
import { listOrders } from "@/lib/nimiq/orders";

/** The orders a device remembers, newest first; settles any still moving. */
export async function GET(req: NextRequest) {
  const stop = await guardRequest(req, { action: "orders", perMinute: 20 });
  if (stop) return stop;

  const input = parse(
    orderIdsField,
    req.nextUrl.searchParams.get("ids") ?? undefined,
  );
  if (input.response) return input.response;

  try {
    return ok({ orders: await listOrders(input.data) });
  } catch (error) {
    return handleError(error, "order list");
  }
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addressField,
  guardRequest,
  handleError,
  ok,
  parse,
} from "@/lib/nimiq/api";
import { getAccountSummary } from "@/lib/nimiq/orders";

const schema = z.object({ address: addressField });

/** USDT balance on Polygon and what is left of today's limit for a wallet. */
export async function GET(req: NextRequest) {
  const stop = await guardRequest(req, { action: "account", perMinute: 30 });
  if (stop) return stop;

  const input = parse(schema, {
    address: req.nextUrl.searchParams.get("address") ?? undefined,
  });
  if (input.response) return input.response;

  try {
    return ok(await getAccountSummary(input.data.address));
  } catch (error) {
    return handleError(error, "account");
  }
}

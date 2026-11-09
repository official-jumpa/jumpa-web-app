import type { NextRequest } from "next/server";
import { guardRequest, handleError, ok } from "@/lib/nimiq/api";
import { tagStatus } from "@/lib/nimiq/names";

/** Exact match only, so the list of tags can't be browsed: who holds it, or whether it's free. */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/v1/nimiq/names/[tag]">,
) {
  const stop = await guardRequest(req, {
    action: "name_lookup",
    perMinute: 40,
  });
  if (stop) return stop;

  try {
    return ok(await tagStatus((await ctx.params).tag));
  } catch (error) {
    return handleError(error, "name lookup");
  }
}

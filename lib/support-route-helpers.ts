/** What every support route shares: who is asking, and how a refusal becomes a response. */
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { SupportAgentContext } from "@/lib/ai/support-agent";
import type { AuthenticatedUser } from "@/lib/functions/permissionFunctions";
import { TicketError } from "@/lib/functions/supportTicketFunctions";
import { formatZodError } from "@/lib/validations/validation-helper";

export function supportContext(user: AuthenticatedUser): SupportAgentContext {
  return {
    userName: user.nickname || user.name,
    jumpaTag: user.jumpaTag,
    email: user.email,
  };
}

export function invalidBody(error: ZodError) {
  return NextResponse.json(formatZodError(error), { status: 400 });
}

/** A `TicketError` carries its own status and user-facing copy; anything else is a 500. */
export function supportErrorResponse(
  err: unknown,
  tag: string,
  fallback: string,
) {
  if (err instanceof TicketError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[${tag}]`, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

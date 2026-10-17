import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { postUserMessage } from "@/lib/functions/supportConversationFunctions";
import { dispatchSupportEvents } from "@/lib/functions/supportEventFunctions";
import {
  findOpenTicketForTransaction,
  getTicketThread,
  listUserTickets,
  markTicketSeen,
} from "@/lib/functions/supportTicketFunctions";
import {
  invalidBody,
  supportContext,
  supportErrorResponse,
} from "@/lib/support-route-helpers";
import { createTicketSchema } from "@/lib/validations/support.validation";

/**
 * GET /api/support/tickets — the Messages list.
 * GET /api/support/tickets?tx=<id> — the open conversation about that transaction, if any.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "support_tickets_list" },
  });
  if (!auth.ok) return auth.response;

  try {
    const tx = req.nextUrl.searchParams.get("tx")?.trim();
    if (tx) {
      const ticketId = await findOpenTicketForTransaction(auth.userId, tx);
      return NextResponse.json({ ticketId });
    }
    return NextResponse.json({ tickets: await listUserTickets(auth.userId) });
  } catch (err) {
    return supportErrorResponse(
      err,
      "Support tickets",
      "Couldn't load your conversations",
    );
  }
}

/** POST /api/support/tickets — starts a conversation with its first message. */
export async function POST(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "support_tickets_create" },
  });
  if (!auth.ok) return auth.response;

  const parsed = createTicketSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return invalidBody(parsed.error);

  try {
    const { ticketId, events } = await postUserMessage({
      userId: auth.userId,
      context: supportContext(auth.user),
      ...parsed.data,
    });
    await dispatchSupportEvents(events);
    await markTicketSeen(auth.userId, ticketId);
    const thread = await getTicketThread(auth.userId, ticketId);
    return NextResponse.json({ ticketId, thread }, { status: 201 });
  } catch (err) {
    return supportErrorResponse(
      err,
      "Support tickets",
      "Couldn't send your message",
    );
  }
}

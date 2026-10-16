import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  postUserMessage,
  requestHuman,
} from "@/lib/functions/supportConversationFunctions";
import { dispatchSupportEvents } from "@/lib/functions/supportEventFunctions";
import {
  getTicketThread,
  markTicketSeen,
  rateTicket,
  type SupportEvent,
} from "@/lib/functions/supportTicketFunctions";
import {
  invalidBody,
  supportContext,
  supportErrorResponse,
} from "@/lib/support-route-helpers";
import {
  sinceSchema,
  ticketActionSchema,
} from "@/lib/validations/support.validation";

type Params = { params: Promise<{ id: string }> };

const NOT_FOUND = () =>
  NextResponse.json({ error: "Conversation not found." }, { status: 404 });

/**
 * GET /api/support/tickets/:id?since=<cursor>
 * The thread, or only what arrived since the last poll. Opening it marks it seen.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "support_ticket_read" },
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const since = sinceSchema.parse(req.nextUrl.searchParams.get("since"));
    const thread = await getTicketThread(auth.userId, id, since);
    if (!thread) return NOT_FOUND();
    await markTicketSeen(auth.userId, id);
    return NextResponse.json(thread);
  } catch (err) {
    return supportErrorResponse(
      err,
      "Support ticket",
      "Couldn't load this conversation",
    );
  }
}

/**
 * POST /api/support/tickets/:id
 * { action: "message", text, attachments?, transactionId? } | { action: "escalate" }
 * | { action: "rate", score, comment? } — answers with the whole thread.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "support_ticket_action" },
  });
  if (!auth.ok) return auth.response;

  const parsed = ticketActionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return invalidBody(parsed.error);

  try {
    const { id } = await params;
    const body = parsed.data;
    let events: SupportEvent[] = [];

    if (body.action === "message") {
      ({ events } = await postUserMessage({
        userId: auth.userId,
        context: supportContext(auth.user),
        ticketId: id,
        text: body.text,
        attachments: body.attachments,
        transactionId: body.transactionId,
      }));
    } else if (body.action === "escalate") {
      ({ events } = await requestHuman(auth.userId, id));
    } else {
      await rateTicket(auth.userId, id, body.score, body.comment);
    }

    dispatchSupportEvents(events);
    await markTicketSeen(auth.userId, id);
    const thread = await getTicketThread(auth.userId, id);
    if (!thread) return NOT_FOUND();
    return NextResponse.json(thread);
  } catch (err) {
    return supportErrorResponse(
      err,
      "Support ticket",
      "Couldn't update this conversation",
    );
  }
}

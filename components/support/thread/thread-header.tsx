import Link from "next/link";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { SupportHeader } from "@/components/support/support-header";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { supportHref } from "@/lib/support";
import { STATUS_COPY, type TicketView } from "@/lib/support-tickets";
import { AgentMark } from "./agent-mark";

/** Who is on the other end, and what state the conversation is in. */
export function ThreadHeader({ ticket }: { ticket: TicketView | null }) {
  const agent = ticket?.status === "live" ? ticket.agentName : null;

  return (
    <SupportHeader
      // A direct load of a conversation (an email link) falls back to the list.
      back={ticket ? supportHref("messages") : supportHref()}
      action={
        <Link
          prefetch
          href={supportHref("messages")}
          aria-label="Your messages"
          className="tap flex size-11 items-center justify-center rounded-full text-jumpa-primary-600 active:scale-95"
        >
          <MessageCircleDotsIcon className="size-6" />
        </Link>
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        {agent ? <AgentMark name={agent} /> : <AgentAvatar />}
        <span className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm leading-4 font-semibold text-jumpa-black">
            Jumpa Support
          </h1>
          <span className="flex min-w-0 items-center gap-1 text-xs leading-4 text-jumpa-neutral-500">
            {agent ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-jumpa-success"
              />
            ) : null}
            <span className="truncate">{statusLine(ticket, agent)}</span>
          </span>
        </span>
      </span>
    </SupportHeader>
  );
}

function statusLine(ticket: TicketView | null, agent: string | null): string {
  if (agent) return `${agent} from the Jumpa team`;
  if (!ticket || ticket.status === "ai") return "Assistant · replies instantly";
  return STATUS_COPY[ticket.status].label;
}

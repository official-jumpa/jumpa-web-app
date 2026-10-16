import { AgentAvatar } from "@/components/chat/agent-avatar";
import { AttachmentList } from "@/components/chat/attachment-list";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import { LocalTime } from "@/components/ui/local-time";
import type { OutgoingMessage } from "@/hooks/use-support-ticket";
import { cn } from "@/lib/cn";
import type { TicketMessage } from "@/lib/support-tickets";
import { AgentMark } from "./agent-mark";
import { SharedTransaction } from "./shared-transaction";

type Row = TicketMessage | OutgoingMessage;

const isOutgoing = (row: Row): row is OutgoingMessage => "delivery" in row;

/** Consecutive messages from one sender share an avatar, a name and a time. */
function sender(row: Row): string {
  if (row.role === "agent") return `agent:${row.agentName ?? ""}`;
  if (row.role === "system") return `system:${row.id}`;
  return row.role;
}

/** The conversation, stored messages first and anything still on its way after. */
export function ThreadMessages({
  messages,
  outbox,
  onRetry,
  onDiscard,
}: {
  messages: TicketMessage[];
  outbox: OutgoingMessage[];
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const rows: Row[] = [...messages, ...outbox];

  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => {
        const first = i === 0 || sender(rows[i - 1]) !== sender(row);
        const last =
          i === rows.length - 1 || sender(rows[i + 1]) !== sender(row);
        return (
          <li key={row.id} className={first ? "mt-4 first:mt-0" : "mt-1.5"}>
            {row.role === "system" ? (
              <SystemLine message={row} />
            ) : row.role === "user" ? (
              <UserMessage
                message={row}
                last={last}
                onRetry={onRetry}
                onDiscard={onDiscard}
              />
            ) : (
              <TeamMessage message={row} first={first} last={last} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** "Ada joined the conversation" and the like. */
function SystemLine({ message }: { message: TicketMessage }) {
  return (
    <p className="mx-auto w-fit max-w-[85%] rounded-pill bg-jumpa-neutral-50 px-3 py-1.5 text-center text-xs leading-4 text-jumpa-neutral-500">
      {message.content} · <LocalTime at={message.createdAt} format="clock" />
    </p>
  );
}

function Body({ message, align }: { message: Row; align: "user" | "agent" }) {
  return (
    <>
      {message.content ? (
        <MessageBubble from={align}>{message.content}</MessageBubble>
      ) : null}
      {message.attachments?.length ? (
        <AttachmentList items={message.attachments} align={align} />
      ) : null}
      {message.transaction ? (
        <SharedTransaction transaction={message.transaction} />
      ) : null}
    </>
  );
}

const STAMP = "text-xs leading-4 text-jumpa-neutral-500";

/** The assistant or a person from the team. */
function TeamMessage({
  message,
  first,
  last,
}: {
  message: TicketMessage;
  first: boolean;
  last: boolean;
}) {
  const person = message.role === "agent";
  const name = message.agentName || "Jumpa";

  return (
    <div className="flex items-start gap-1.5">
      {first ? (
        person ? (
          <AgentMark name={name} />
        ) : (
          <AgentAvatar />
        )
      ) : (
        <span aria-hidden="true" className="w-9.5 shrink-0" />
      )}
      <div className="flex max-w-[80%] min-w-0 flex-col items-start gap-1.5">
        {first ? (
          <span className={cn(STAMP, "font-medium")}>
            {person ? `${name} · Jumpa team` : "Assistant"}
          </span>
        ) : null}
        <Body message={message} align="agent" />
        {last ? (
          <LocalTime at={message.createdAt} format="clock" className={STAMP} />
        ) : null}
      </div>
    </div>
  );
}

function UserMessage({
  message,
  last,
  onRetry,
  onDiscard,
}: {
  message: Row;
  last: boolean;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const outgoing = isOutgoing(message) ? message : null;

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[78%] min-w-0 flex-col items-end gap-1.5">
        <Body message={message} align="user" />
        {outgoing?.delivery === "failed" ? (
          <span className="flex items-center gap-2 text-xs leading-4">
            <TriangleWarningIcon className="size-4 text-jumpa-danger" />
            <span className="text-jumpa-neutral-700">Not sent</span>
            <button
              type="button"
              onClick={() => onRetry(outgoing.id)}
              className="tap font-semibold text-jumpa-primary-600"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(outgoing.id)}
              className="tap font-medium text-jumpa-neutral-700"
            >
              Remove
            </button>
          </span>
        ) : outgoing ? (
          <span className={STAMP}>Sending…</span>
        ) : last ? (
          <LocalTime at={message.createdAt} format="clock" className={STAMP} />
        ) : null}
      </div>
    </div>
  );
}

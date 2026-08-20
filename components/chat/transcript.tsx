import { ActionRow } from "@/components/chat/action-row";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { QuoteCard } from "@/components/chat/quote-card";
import { ReceiptCard } from "@/components/chat/receipt-card";
import { TransferCard } from "@/components/chat/transfer-card";
import { OnrampCheckoutCard } from "@/components/chat/onramp-checkout-card";
import { OfframpCheckoutCard } from "@/components/chat/offramp-checkout-card";
import type { ChatEntry, ChatItem, QuoteCard as Quote } from "@/lib/chat";

type Handlers = {
  onConfirm: () => void;
  onCancel: () => void;
  onUpdateQuote?: (card: Quote) => void;
};

/** The conversation so far. Groups sit 20px apart, items within a group 8px. */
export function Transcript({
  entries,
  ...handlers
}: { entries: ChatEntry[] } & Handlers) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-3.5">
      {entries.map((entry) =>
        entry.kind === "day" ? (
          <p
            key={entry.id}
            className="text-center text-[8px] leading-2.5 text-jumpa-black/50"
          >
            {entry.label}
          </p>
        ) : entry.role === "agent" ? (
          <div key={entry.id} className="flex items-start gap-1">
            <AgentAvatar />
            <Group
              items={entry.items}
              from="agent"
              className="w-59.5 items-start"
              {...handlers}
            />
          </div>
        ) : (
          <Group
            key={entry.id}
            items={entry.items}
            from="user"
            className="items-end"
            {...handlers}
          />
        ),
      )}
    </div>
  );
}

function Group({
  items,
  from,
  className,
  ...handlers
}: {
  items: ChatItem[];
  from: "user" | "agent";
  className: string;
} & Handlers) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {items.map((item, index) => (
        <Item
          key={`${item.kind}-${index}`}
          item={item}
          from={from}
          {...handlers}
        />
      ))}
    </div>
  );
}

function Item({
  item,
  from,
  onConfirm,
  onCancel,
  onUpdateQuote,
}: { item: ChatItem; from: "user" | "agent" } & Handlers) {
  switch (item.kind) {
    case "text":
      return (
        <MessageBubble from={from} paragraph={item.paragraph}>
          {item.text}
        </MessageBubble>
      );
    case "quote":
      return (
        <QuoteCard
          card={item.card}
          isEditable={item.isEditable !== false}
          onUpdateQuote={onUpdateQuote}
        />
      );
    case "receipt":
      return <ReceiptCard card={item.card} />;
    case "transfer":
      return <TransferCard card={item.card} />;
    case "onramp":
      return <OnrampCheckoutCard card={item.card} />;
    case "offramp":
      return <OfframpCheckoutCard card={item.card} />;
    case "actions":
      return <ActionRow onConfirm={onConfirm} onCancel={onCancel} />;
  }
}

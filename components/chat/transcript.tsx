import type { CSSProperties } from "react";
import { ActionRow } from "@/components/chat/action-row";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { OfframpCheckoutCard } from "@/components/chat/offramp-checkout-card";
import { OnrampCheckoutCard } from "@/components/chat/onramp-checkout-card";
import { QuoteCard } from "@/components/chat/quote-card";
import { ReceiptCard } from "@/components/chat/receipt-card";
import { TransferCard } from "@/components/chat/transfer-card";
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
            {/* Agent replies carry the cards, so they get the wider column. */}
            <Group
              items={entry.items}
              from="agent"
              className="w-full max-w-75 items-start"
              {...handlers}
            />
          </div>
        ) : (
          <Group
            key={entry.id}
            items={entry.items}
            from="user"
            className="ml-auto w-full max-w-70 items-end"
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
  // A group carrying a fresh reply reveals its text word by word; anything below
  // that text rises in behind it, so the card lands as the sentence finishes.
  const isFresh = items.some((item) => item.kind === "text" && item.reveal);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {items.map((item, index) =>
        isFresh && item.kind !== "text" ? (
          <div
            key={`${item.kind}-${index}`}
            className="w-full animate-rise stagger"
            style={{ "--i": index + 3 } as CSSProperties}
          >
            <Item item={item} from={from} {...handlers} />
          </div>
        ) : (
          <Item
            key={`${item.kind}-${index}`}
            item={item}
            from={from}
            {...handlers}
          />
        ),
      )}
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
        <MessageBubble
          from={from}
          paragraph={item.paragraph}
          reveal={item.reveal}
        >
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

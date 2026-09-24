import type { CSSProperties } from "react";
import { AccountsCard } from "@/components/chat/accounts-card";
import { ActionRow } from "@/components/chat/action-row";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { AttachmentList } from "@/components/chat/attachment-list";
import { BridgeCard } from "@/components/chat/bridge-card";
import { ContactsCard } from "@/components/chat/contacts-card";
import { MessageBubble } from "@/components/chat/message-bubble";
import { OfframpCheckoutCard } from "@/components/chat/offramp-checkout-card";
import { OnrampCheckoutCard } from "@/components/chat/onramp-checkout-card";
import { OptionsCard } from "@/components/chat/options-card";
import { PlansCard } from "@/components/chat/plans-card";
import { QuoteCard } from "@/components/chat/quote-card";
import { ReceiptCard } from "@/components/chat/receipt-card";
import { Sep24Card } from "@/components/chat/sep24-card";
import { TransferCard } from "@/components/chat/transfer-card";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import type { ChatEntry, ChatItem, QuoteCard as Quote } from "@/lib/chat";
import { cn } from "@/lib/cn";

type Handlers = {
  onConfirm: () => void;
  onCancel: () => void;
  onUpdateQuote?: (card: Quote) => void;
  /** Picking a row in a chooser answers the agent as the next user message. */
  onReply?: (reply: string) => void;
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
            className="text-center text-[11px] leading-4 text-jumpa-neutral-275"
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
        item.kind === "text" ? (
          <Item
            key={`${item.kind}-${index}`}
            item={item}
            from={from}
            {...handlers}
          />
        ) : (
          // The wrapper is unconditional. Dropping it when the reveal ends
          // remounts the card, which wipes a chooser's own selection.
          <div
            key={`${item.kind}-${index}`}
            className={cn("w-full", isFresh && "animate-rise stagger")}
            style={{ "--i": index + 3 } as CSSProperties}
          >
            <Item item={item} from={from} {...handlers} />
          </div>
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
  onReply,
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
    case "attachments":
      return <AttachmentList items={item.items} align={from} transcript={item.transcript} />;
    case "quote":
      return (
        <ChatErrorBoundary fallbackTitle="Swap quote preview unavailable">
          <QuoteCard
            card={item.card}
            isEditable={item.isEditable !== false}
            onUpdateQuote={onUpdateQuote}
          />
        </ChatErrorBoundary>
      );
    case "bridge":
      return (
        <ChatErrorBoundary fallbackTitle="Bridge quote preview unavailable">
          <BridgeCard card={item.card} />
        </ChatErrorBoundary>
      );
    case "receipt":
      return (
        <ChatErrorBoundary fallbackTitle="Receipt preview unavailable">
          <ReceiptCard card={item.card} />
        </ChatErrorBoundary>
      );
    case "transfer":
      return (
        <ChatErrorBoundary fallbackTitle="Transfer card preview unavailable">
          <TransferCard card={item.card} />
        </ChatErrorBoundary>
      );
    case "onramp":
      return (
        <ChatErrorBoundary fallbackTitle="Deposit card preview unavailable">
          <OnrampCheckoutCard card={item.card} onCancel={onCancel} />
        </ChatErrorBoundary>
      );
    case "offramp":
      return (
        <ChatErrorBoundary fallbackTitle="Withdrawal card preview unavailable">
          <OfframpCheckoutCard card={item.card} onReply={onReply} />
        </ChatErrorBoundary>
      );
    case "options":
      return (
        <ChatErrorBoundary fallbackTitle="Options card preview unavailable">
          <OptionsCard card={item.card} answer={item.answer} onReply={onReply} />
        </ChatErrorBoundary>
      );
    case "plans":
      return (
        <ChatErrorBoundary fallbackTitle="Savings plans preview unavailable">
          <PlansCard card={item.card} answer={item.answer} onReply={onReply} />
        </ChatErrorBoundary>
      );
    case "contacts":
      return (
        <ChatErrorBoundary fallbackTitle="Contacts card preview unavailable">
          <ContactsCard card={item.card} answer={item.answer} onReply={onReply} />
        </ChatErrorBoundary>
      );
    case "accounts":
      return (
        <ChatErrorBoundary fallbackTitle="Account card preview unavailable">
          <AccountsCard card={item.card} answer={item.answer} onReply={onReply} />
        </ChatErrorBoundary>
      );
    case "sep24":
      return (
        <ChatErrorBoundary fallbackTitle="Sandbox window preview unavailable">
          <Sep24Card card={item.card} />
        </ChatErrorBoundary>
      );
    case "actions":
      return (
        <ActionRow
          onConfirm={onConfirm}
          onCancel={onCancel}
          confirmLabel={item.confirmLabel}
          cancelLabel={item.cancelLabel}
        />
      );
  }
}

import { DetailPanel, OptionList } from "@/components/chat/card-rows";
import { CardRule, CardTitle, ChatCard } from "@/components/chat/chat-card";
import type { AccountsCard as Accounts } from "@/lib/chat";
import { answeredAction } from "@/lib/chat-answer";

/** Where a cash-out lands: the saved account, or a way to name another one. */
export function AccountsCard({
  card,
  answer,
  onReply,
}: {
  card: Accounts;
  /** The reply it already got, so a reload lights whatever was picked. */
  answer?: string;
  onReply?: (reply: string) => void;
}) {
  // Confirm and the rows under it share one answer, so the pill takes first
  // claim on it — otherwise a Custom row below would light as well.
  const claimed = answeredAction(card.account, answer);

  return (
    <ChatCard>
      <CardTitle title={card.title} />
      <CardRule />
      <DetailPanel details={card.account} answer={answer} onReply={onReply} />

      {card.options && card.options.length > 0 ? (
        <>
          <CardRule />
          <OptionList
            options={card.options}
            answer={answer}
            claimed={claimed}
            onSelect={onReply}
          />
        </>
      ) : null}
    </ChatCard>
  );
}

import { DetailPanel, OptionList } from "@/components/chat/card-rows";
import { CardRule, CardTitle, ChatCard } from "@/components/chat/chat-card";
import type { AccountsCard as Accounts } from "@/lib/chat";

/** Where a cash-out lands: the saved account, or a way to name another one. */
export function AccountsCard({
  card,
  onReply,
}: {
  card: Accounts;
  onReply?: (reply: string) => void;
}) {
  return (
    <ChatCard>
      <CardTitle title={card.title} />
      <CardRule />
      <DetailPanel details={card.account} onReply={onReply} />

      {card.options && card.options.length > 0 ? (
        <>
          <CardRule />
          <OptionList options={card.options} onSelect={onReply} />
        </>
      ) : null}
    </ChatCard>
  );
}

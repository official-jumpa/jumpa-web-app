import { OptionList, PlanList } from "@/components/chat/card-rows";
import { ChatCard } from "@/components/chat/chat-card";
import type { PlansCard as Plans } from "@/lib/chat";

/**
 * The user's savings plans. Picking one answers the agent, so the reply lands
 * as the next user message; the rows under them are the flow's own actions.
 */
export function PlansCard({
  card,
  onReply,
}: {
  card: Plans;
  onReply?: (reply: string) => void;
}) {
  return (
    <ChatCard padded>
      <PlanList plans={card.plans} onSelect={onReply} />
      {card.options?.length ? (
        <OptionList options={card.options} onSelect={onReply} />
      ) : null}
    </ChatCard>
  );
}

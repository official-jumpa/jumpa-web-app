import { OptionList, PlanList } from "@/components/chat/card-rows";
import { ChatCard } from "@/components/chat/chat-card";
import type { PlansCard as Plans } from "@/lib/chat";
import { answeredPlan } from "@/lib/chat-answer";

/**
 * The user's savings plans. Picking one answers the agent, so the reply lands
 * as the next user message; the rows under them are the flow's own actions.
 */
export function PlansCard({
  card,
  answer,
  onReply,
}: {
  card: Plans;
  /** The reply it already got, so a reload lights the row that was picked. */
  answer?: string;
  onReply?: (reply: string) => void;
}) {
  // The plans and the rows under them share one answer, so a plan takes first
  // claim on it — otherwise a Custom row below would light as well.
  const claimed = answeredPlan(card.plans, answer) !== null;

  return (
    <ChatCard padded>
      <PlanList plans={card.plans} answer={answer} onSelect={onReply} />
      {card.options?.length ? (
        <OptionList
          options={card.options}
          answer={answer}
          claimed={claimed}
          onSelect={onReply}
        />
      ) : null}
    </ChatCard>
  );
}

import { OptionList } from "@/components/chat/card-rows";
import { ChatCard } from "@/components/chat/chat-card";
import type { OptionsCard as Options } from "@/lib/chat";

/**
 * A chooser: payment method, savings category, target, duration or bank.
 * Picking a row answers the agent, so the reply lands as the next user message.
 */
export function OptionsCard({
  card,
  answer,
  onReply,
}: {
  card: Options;
  /** The reply it already got, so a reload lights the row that was picked. */
  answer?: string;
  onReply?: (reply: string) => void;
}) {
  return (
    <ChatCard padded>
      <OptionList options={card.options} answer={answer} onSelect={onReply} />
    </ChatCard>
  );
}

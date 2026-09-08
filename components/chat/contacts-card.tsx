import { ContactList } from "@/components/chat/card-rows";
import { ChatCard } from "@/components/chat/chat-card";
import type { ContactsCard as Contacts } from "@/lib/chat";

/** Candidate recipients when a name matches more than one person. */
export function ContactsCard({
  card,
  answer,
  onReply,
}: {
  card: Contacts;
  /** The reply it already got, so a reload lights the row that was picked. */
  answer?: string;
  onReply?: (reply: string) => void;
}) {
  return (
    <ChatCard padded>
      <ContactList
        contacts={card.contacts}
        answer={answer}
        onSelect={onReply}
      />
    </ChatCard>
  );
}

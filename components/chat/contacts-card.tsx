import { ContactList } from "@/components/chat/card-rows";
import { ChatCard } from "@/components/chat/chat-card";
import type { ContactsCard as Contacts } from "@/lib/chat";

/** Candidate recipients when a name matches more than one person. */
export function ContactsCard({
  card,
  onReply,
}: {
  card: Contacts;
  onReply?: (reply: string) => void;
}) {
  return (
    <ChatCard padded>
      <ContactList contacts={card.contacts} onSelect={onReply} />
    </ChatCard>
  );
}

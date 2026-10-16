import { FaqList } from "@/components/support/faq-list";
import { UsersIcon } from "@/components/ui/icons/users";
import { WhatsappIcon } from "@/components/ui/icons/whatsapp";
import { faqsFor, JUMPA_COMMUNITY_WHATSAPP_URL } from "@/lib/support";
import type { ReplyEstimate, TicketCategory } from "@/lib/support-tickets";
import { StatusCard } from "./status-card";

/** Handed to the team, nobody has picked it up yet. */
export function WaitingCard({
  estimate,
  category,
}: {
  estimate: ReplyEstimate | null;
  category: TicketCategory | null;
}) {
  return (
    <>
      <StatusCard Icon={UsersIcon} title="You're in the queue" live>
        <p>
          {estimate?.text ?? "Someone will reply as soon as they're free"}. You
          can leave this screen; we'll email you.
        </p>
        {estimate ? (
          <p className="text-jumpa-neutral-500">
            Team hours:{" "}
            <span className="whitespace-nowrap">{estimate.hours}</span>
          </p>
        ) : null}
      </StatusCard>

      <section aria-labelledby="support-wait" className="mt-5">
        <h2
          id="support-wait"
          className="mb-2 text-xs leading-4 font-medium text-jumpa-neutral-500"
        >
          While you wait
        </h2>
        <FaqList items={faqsFor(category)} />
        <a
          href={JUMPA_COMMUNITY_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="tap mt-3 flex items-center gap-2 rounded-panel bg-jumpa-neutral-50 px-5 py-3.5 text-xs leading-4 font-medium text-jumpa-black"
        >
          <WhatsappIcon className="size-5 shrink-0 text-jumpa-success" />
          Ask the Jumpa community on WhatsApp
        </a>
      </section>
    </>
  );
}

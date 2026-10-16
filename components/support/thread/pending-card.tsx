import { RefreshIcon } from "@/components/ui/icons/refresh";
import { LocalTime } from "@/components/ui/local-time";
import { StatusCard } from "./status-card";

/** The team is working on it away from the chat, against a deadline. */
export function PendingCard({ dueAt }: { dueAt: string | null }) {
  return (
    <StatusCard Icon={RefreshIcon} title="We're looking into this">
      <p>
        {dueAt ? (
          <>
            We'll update you by{" "}
            <LocalTime
              at={dueAt}
              format="deadline"
              className="font-semibold text-jumpa-black"
            />
            , and email you when we do.
          </>
        ) : (
          "We'll update you here and by email as soon as we know more."
        )}
      </p>
    </StatusCard>
  );
}

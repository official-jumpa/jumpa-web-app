import { Button } from "@/components/ui/button";
import { supportHref } from "@/lib/support";

/** Takes the composer's place once a conversation can no longer be reopened. */
export function ClosedFooter() {
  return (
    <div className="flex flex-col items-center gap-3 pb-1">
      <p className="text-xs leading-4 text-jumpa-neutral-500">
        This conversation is closed.
      </p>
      <Button href={supportHref("chat")} variant="gradient" size="lg">
        Start a new conversation
      </Button>
    </div>
  );
}

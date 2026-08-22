import { AgentAvatar } from "@/components/chat/agent-avatar";

/**
 * Holds the spot the reply will land in while it is being written. Sitting in the
 * transcript rather than below it means the bubble does not jump when it arrives.
 */
export function TypingIndicator() {
  return (
    <div className="flex animate-rise items-start gap-1 px-3.5">
      <AgentAvatar />
      <div className="flex h-11 items-center gap-1.5 rounded-xl bg-jumpa-neutral-95 px-4.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 animate-typing rounded-full bg-jumpa-primary-600"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

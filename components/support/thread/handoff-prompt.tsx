import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";

/** Always within reach while the assistant holds the conversation. */
export function HandoffPrompt({
  busy,
  onEscalate,
}: {
  busy: boolean;
  onEscalate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEscalate}
      disabled={busy}
      className="tap mx-auto flex h-9 items-center gap-1.5 rounded-pill bg-jumpa-white px-3.5 text-sm leading-4 font-medium text-jumpa-primary-600 ring-1 ring-jumpa-primary-100 ring-inset active:scale-95 disabled:opacity-60"
    >
      <UserAlt1Icon className="size-4.5" />
      {busy ? "Connecting you…" : "Talk to a person"}
    </button>
  );
}

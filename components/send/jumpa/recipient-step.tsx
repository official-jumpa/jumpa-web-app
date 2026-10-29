import { RecipientCard } from "@/components/send/jumpa/recipient-card";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import type { LookupStatus } from "@/hooks/use-recipient-lookup";
import type { JumpaRecipient } from "@/lib/jumpa-send";

const HINT: Partial<Record<LookupStatus, string>> = {
  searching: "Looking for a match…",
  none: "No Jumpa user matches that yet.",
  error: "Couldn't check that right now. Try again.",
};

/** Who the money goes to: one field, with live suggestions from the third character. */
export function RecipientStep({
  query,
  onQueryChange,
  status,
  recipients,
  error,
  onPick,
  onContinue,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: LookupStatus;
  recipients: JumpaRecipient[];
  error?: string;
  onPick: (recipient: JumpaRecipient) => void;
  onContinue: () => void;
}) {
  const hint = error ? undefined : HINT[status];

  return (
    <form
      noValidate
      className="mt-5.25 flex flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-xl leading-4.5 font-semibold tracking-jumpa-snug text-jumpa-black">
          Who are you sending to?
        </h2>
        <p className="max-w-78 text-xs leading-4.5 tracking-jumpa-snug text-jumpa-neutral-400">
          Enter the Jumpa ID, phone number, email or wallet address of the recipient.
        </p>

        <label
          className={`flex h-17.25 flex-col justify-center gap-0.5 rounded-tile border bg-jumpa-neutral-50 px-4 ${
            error ? "border-jumpa-danger" : "border-jumpa-primary-50"
          }`}
        >
          <span className="text-xs leading-4.5 tracking-jumpa-snug text-jumpa-neutral-400">
            Recipient tag, phone or wallet address
          </span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            // biome-ignore lint/a11y/noAutofocus: the screen exists to take this entry
            autoFocus
            className="w-full bg-transparent text-sm leading-4.5 font-medium text-jumpa-black outline-none"
          />
        </label>
        <FieldError>{error}</FieldError>

        {recipients.length > 0 ? (
          <ul aria-label="Matching Jumpa users" className="flex flex-col gap-2">
            {recipients.map((recipient) => (
              <li key={recipient.tag ?? recipient.addresses.stellar ?? recipient.name}>
                <button
                  type="button"
                  onClick={() => onPick(recipient)}
                  aria-label={`Send to ${recipient.name}`}
                  className="tap w-full rounded-tile active:scale-[0.99]"
                >
                  <RecipientCard
                    recipient={recipient}
                    variant="match"
                    trailing={<ChevronRightIcon className="size-5 shrink-0 text-jumpa-slate-600" />}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : hint ? (
          <p aria-live="polite" className="text-xs leading-4.5 text-jumpa-neutral-400">
            {hint}
          </p>
        ) : null}
      </div>

      <div className="mt-auto pt-6">
        <Button type="submit" variant="gradient" size="lg">
          Continue
        </Button>
      </div>
    </form>
  );
}

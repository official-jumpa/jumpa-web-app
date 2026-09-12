import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";

/** How long a quote holds. Shared so every screen that quotes says it alike. */
export function QuoteLockNote({ seconds }: { seconds: number }) {
  return (
    <p className="mx-auto flex max-w-72 items-start justify-center text-center text-xs leading-4 text-jumpa-black">
      <TriangleWarningIcon className="mt-px size-4 shrink-0 text-jumpa-warning" />
      <span>
        Your quote is locked for {seconds} seconds. After that, you'll need to
        get a new quote
      </span>
    </p>
  );
}

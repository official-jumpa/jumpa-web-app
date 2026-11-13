/** Frame of a one-line auto-save row: the wallet on the review, the entry on a plan. */
export const ROW =
  "flex h-17 items-center gap-3.5 rounded-surface bg-jumpa-white pr-4 pl-3 inset-ring-[1.5px] inset-ring-jumpa-grey-150";

/** A row's text: its name over a single line of detail. */
export function RowLabel({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.75">
      <span className="text-base leading-5 font-semibold tracking-jumpa-snug text-jumpa-grey-950">
        {title}
      </span>
      <span className="truncate text-xs leading-3.5 tracking-jumpa-snug text-jumpa-grey-500">
        {caption}
      </span>
    </span>
  );
}

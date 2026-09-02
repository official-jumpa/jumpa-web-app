import { CircleInformationIcon } from "@/components/ui/icons/circle-information";

/** Placeholder card where a product has no plans yet. */
export function EmptyPlans({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <div className="flex h-43.5 flex-col items-center justify-center gap-4 rounded-surface bg-jumpa-primary-50 p-4">
      <span className="flex size-10 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
        <CircleInformationIcon className="size-4.75" />
      </span>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-sm font-semibold text-jumpa-black">{title}</p>
        {caption ? (
          <p className="text-xs text-jumpa-neutral-350">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}

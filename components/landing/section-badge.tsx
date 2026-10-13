import { Art } from "@/components/landing/art";
import { cn } from "@/lib/cn";

/** The eyebrow pill above each section heading: a flash disc and a label. */
export function SectionBadge({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-24 shrink-0 items-center gap-7.5 rounded-full border-u-0.75 border-jumpa-primary-100 bg-jumpa-primary-50 pr-12 pl-4 md:h-35 md:gap-11 md:border-u-1 md:pr-15 md:pl-6",
        className,
      )}
    >
      <span className="flex size-17.5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 md:size-25">
        <Art
          src="/images/landing/flash.svg"
          className="size-10.25 md:size-14.75"
        />
      </span>
      <span className="whitespace-nowrap font-medium text-jumpa-ink uppercase text-u-12/21.5 -tracking-u-0.25 md:text-u-18/31 md:-tracking-u-0.5">
        {children}
      </span>
    </span>
  );
}

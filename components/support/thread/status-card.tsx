import type { ComponentType, ReactNode, SVGProps } from "react";

/** The shell every stage card shares: a glyph disc, a title and what happens next. */
export function StatusCard({
  Icon,
  title,
  children,
  live = false,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  children: ReactNode;
  /** A pulsing dot on the disc while someone is on their way. */
  live?: boolean;
}) {
  return (
    <section className="mt-5 animate-rise rounded-surface bg-jumpa-primary-50 p-4">
      <div className="flex items-start gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-white">
          <Icon className="size-5 text-jumpa-primary-600" />
          {live ? (
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 flex size-2.5"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-jumpa-warning opacity-60" />
              <span className="relative size-2.5 rounded-full bg-jumpa-warning ring-2 ring-jumpa-white" />
            </span>
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <h2 className="text-sm leading-5 font-semibold text-jumpa-black">
            {title}
          </h2>
          <div className="flex flex-col gap-2 text-xs leading-4.5 text-jumpa-neutral-700">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

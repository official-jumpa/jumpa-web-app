import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shell for every auth screen; `footer` holds the viewport bottom until the body
 * outgrows it. `--auth-gap`/`--auth-pb` are properties because `cn` only concatenates.
 */
export function AuthScreen({
  header,
  footer,
  children,
  className,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col px-4.5 pt-6",
        "pb-[calc(var(--auth-pb,32px)+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {header}
      <main className="flex flex-1 flex-col pt-[var(--auth-gap,32px)]">
        {children}
      </main>
      {footer}
    </div>
  );
}

/** Page title and subtitle. Each screen caps its own width, hence the two class props. */
export function AuthHeading({
  title,
  className,
  titleClassName,
  children,
}: {
  title: ReactNode;
  className?: string;
  titleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h1
        className={cn(
          "text-[28px] leading-8 font-semibold text-jumpa-black",
          titleClassName,
        )}
      >
        {title}
      </h1>
      {children ? (
        <p className="text-sm leading-4 text-jumpa-neutral-800">{children}</p>
      ) : null}
    </div>
  );
}

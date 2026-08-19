import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shell for every sign-up screen. `footer` sits at the bottom of the viewport until
 * the body outgrows it. Pages tune `--auth-gap` and `--auth-pb` — custom properties
 * because `cn` concatenates, so a second `pt-*`/`pb-*` would not win.
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

/**
 * Page title and its supporting line. The design gives each screen its own text
 * width, so `className` caps the block and `titleClassName` the title alone.
 */
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

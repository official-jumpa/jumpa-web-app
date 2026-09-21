import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

export const PLAN_ACTION_BUTTON =
  "tap flex h-13 flex-1 items-center justify-center gap-2 rounded-tile bg-jumpa-neutral-50 " +
  "pl-4 pr-8 text-sm leading-4 font-medium text-jumpa-black active:scale-[0.98]";

/** Bordered row of actions under a plan card and on the circle receipt. */
export function PlanActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-17.5 items-center gap-2 rounded-card border border-jumpa-neutral-100 p-2">
      {children}
    </div>
  );
}

export function PlanAction({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
}) {
  return (
    <Link prefetch href={href} className={PLAN_ACTION_BUTTON}>
      <Icon className="size-6 text-jumpa-primary-600" />
      {children}
    </Link>
  );
}

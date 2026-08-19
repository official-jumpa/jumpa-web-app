import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { cn } from "@/lib/cn";

/** Bordered card wrapping a tinted tile. The body varies per screen. */
export function InsetCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-card border border-jumpa-neutral-100 p-2.25",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 rounded-tile bg-jumpa-neutral-50 px-4 py-3.5">
        {children}
      </div>
    </div>
  );
}

/** Backup option — icon, two lines of copy, chevron. */
export function OptionRow({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-panel border border-jumpa-primary-100 bg-jumpa-white py-4.75 pr-4.5 pl-5.5"
    >
      <span className="shrink-0 text-jumpa-primary-900 [&>svg]:size-6">
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-1 text-jumpa-black">
        <span className="text-xs leading-3.5 font-medium">{title}</span>
        <span className="text-[10px] leading-3.5">{description}</span>
      </span>
      <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
    </Link>
  );
}

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

function Body({
  Icon,
  label,
  value,
  brand,
}: {
  Icon: Icon;
  label: string;
  value?: string;
  brand?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
      {value ? (
        <span className="flex min-w-0 flex-col gap-1 text-left">
          <span className="truncate text-xs leading-3.5 text-jumpa-black">
            {label}
          </span>
          <span className="truncate text-xs leading-3 font-medium text-jumpa-black">
            {value}
          </span>
        </span>
      ) : (
        <span
          className={`truncate text-xs leading-3 font-medium ${
            brand ? "text-jumpa-primary-600" : "text-jumpa-black"
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/** Row that navigates. `value` turns it into the two-line variant. */
export function SettingLink({
  href,
  icon,
  label,
  value,
  brand,
}: {
  href: string;
  icon: Icon;
  label: string;
  value?: string;
  /** Purple label, for the invite row. */
  brand?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 tap active:scale-[0.99]"
    >
      <Body Icon={icon} label={label} value={value} brand={brand} />
      <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
    </Link>
  );
}

/** Row with a trailing control of its own — a toggle, a copy button. */
export function SettingRow({
  icon,
  label,
  value,
  action,
}: {
  icon: Icon;
  label: string;
  value?: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Body Icon={icon} label={label} value={value} />
      {action}
    </div>
  );
}

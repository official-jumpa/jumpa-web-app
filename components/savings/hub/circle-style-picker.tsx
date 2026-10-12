import type { ComponentType, SVGProps } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { MoneybagIcon } from "@/components/ui/icons/moneybag";
import { UsersIcon } from "@/components/ui/icons/users";
import { cn } from "@/lib/cn";
import { CIRCLE_STYLES, type CircleStyleKey } from "@/lib/savings-hub";

const ICON: Record<CircleStyleKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  save_together: UsersIcon,
  shared_pool: MoneybagIcon,
};

/** The two ways a circle can share its money, side by side. */
export function CircleStylePicker({
  value,
  onChange,
}: {
  value: CircleStyleKey;
  onChange: (next: CircleStyleKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(CIRCLE_STYLES) as CircleStyleKey[]).map((key) => {
        const active = key === value;
        const Icon = ICON[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cn(
              "tap flex min-w-0 flex-col items-start gap-2 rounded-xl bg-jumpa-white p-3 text-left active:scale-98",
              active
                ? "inset-ring-2 inset-ring-jumpa-primary-600"
                : "inset-ring-1 inset-ring-jumpa-grey-100",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                <Icon className="size-4.5" />
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-4.5 items-center justify-center rounded-full",
                  active
                    ? "bg-jumpa-primary-600 text-jumpa-white"
                    : "inset-ring-1 inset-ring-jumpa-grey-100",
                )}
              >
                {active ? <CheckIcon className="size-3" /> : null}
              </span>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-4 font-semibold text-jumpa-black">
                {CIRCLE_STYLES[key].label}
              </span>
              <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
                {CIRCLE_STYLES[key].rule}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

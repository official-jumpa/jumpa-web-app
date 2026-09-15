import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { EuroCircleIcon } from "@/components/ui/icons/euro-circle";
import { MoneyBillIcon } from "@/components/ui/icons/money-bill";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { WalletPlusIcon } from "@/components/ui/icons/wallet-plus";
import { cn } from "@/lib/cn";
import { QUICK_ACTIONS } from "@/lib/landing";

const ICONS = {
  "add-funds": WalletPlusIcon,
  "cash-out": EuroCircleIcon,
  balance: MoneyBillIcon,
  savings: BadgePercentIcon,
  swap: SwitchHorizontalIcon,
} as const;

const CHIP =
  "flex items-center rounded-u-32 bg-jumpa-neutral-95 font-medium text-jumpa-black";

/**
 * The five suggestion chips inside the chat mock. The hero panel and the Why
 * Jumpa panel draw the same five; the Why panel is smaller on phones and grows
 * back to the hero's size on desktop.
 */
const VARIANTS = {
  hero: {
    chip: "gap-8 py-8 text-u-10",
    icon: "size-24",
    widths: [
      "flex-1 justify-center",
      "flex-1 justify-center",
      "w-122 justify-center",
      "px-12",
      "px-12",
    ],
  },
  why: {
    chip: "h-29.5 gap-5.75 text-u-7.25 lg:h-auto lg:gap-8 lg:py-8 lg:text-u-10",
    icon: "size-17.75 lg:size-24",
    widths: [
      "w-83.5 justify-center lg:w-auto lg:flex-1",
      "w-83.5 justify-center lg:w-auto lg:flex-1",
      "w-90 justify-center lg:w-122",
      "px-8.75 lg:px-12",
      "px-8.75 lg:px-12",
    ],
  },
} as const;

type QuickActionChipsProps = {
  variant: keyof typeof VARIANTS;
  className?: string;
};

export function QuickActionChips({
  variant,
  className,
}: QuickActionChipsProps) {
  const styles = VARIANTS[variant];
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {[QUICK_ACTIONS.slice(0, 3), QUICK_ACTIONS.slice(3)].map(
        (row, offset) => (
          <div key={row[0].id} className="flex gap-4">
            {row.map((action, index) => {
              const Icon = ICONS[action.id];
              return (
                <span
                  key={action.id}
                  className={cn(
                    CHIP,
                    styles.chip,
                    styles.widths[offset * 3 + index],
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 text-jumpa-primary-600",
                      styles.icon,
                    )}
                  />
                  {action.label}
                </span>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}

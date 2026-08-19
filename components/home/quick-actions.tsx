import Link from "next/link";
import { ArrowSortIcon } from "@/components/ui/icons/arrow-sort";
import { CirclePercentageIcon } from "@/components/ui/icons/circle-percentage";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { MoreDotsIcon } from "@/components/ui/icons/more-dots";
import { HomeSection } from "./home-section";

const ACTIONS = [
  { label: "Savings", href: "/savings", Icon: CoinFrontIcon },
  { label: "Invest", href: "/invest", Icon: CirclePercentageIcon },
  { label: "Data", href: "/data", Icon: ArrowSortIcon },
  { label: "More", href: "/more", Icon: MoreDotsIcon },
];

/** Shortcut tiles to the secondary product areas. */
export function QuickActions() {
  return (
    <HomeSection title="Quick Actions">
      <ul className="flex items-center justify-center gap-10 rounded-panel bg-jumpa-neutral-50 px-7.75 py-5">
        {ACTIONS.map(({ label, href, Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex w-11 flex-col items-center gap-1.5"
            >
              <span className="flex size-11 items-center justify-center rounded-panel bg-jumpa-primary-50 text-jumpa-primary-600">
                <Icon className="size-6" />
              </span>
              <span className="text-center text-[10px] leading-2.5 font-medium text-jumpa-primary-950">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

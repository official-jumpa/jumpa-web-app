import Link from "next/link";
import { ArrowSortIcon } from "@/components/ui/icons/arrow-sort";
import { CirclePercentageIcon } from "@/components/ui/icons/circle-percentage";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { PhoneAltIcon } from "@/components/ui/icons/phone-alt";
import { HomeSection } from "./home-section";

const ACTIONS = [
  { label: "Savings", href: "/savings", Icon: CoinFrontIcon },
  { label: "Invest", href: "/invest", Icon: CirclePercentageIcon },
  { label: "Data", href: "/data", Icon: ArrowSortIcon },
  { label: "Airtime", href: "/airtime", Icon: PhoneAltIcon },
];

/** Shortcut tiles to the savings, invest and bill-payment areas. */
export function QuickActions() {
  return (
    <HomeSection title="Quick Actions">
      <ul className="flex items-center justify-center gap-10 rounded-panel bg-jumpa-neutral-50 px-8.75 py-5">
        {ACTIONS.map(({ label, href, Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="tap flex w-11 flex-col items-center gap-1.5 active:scale-95"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400">
                <Icon className="size-6" />
              </span>
              <span className="w-12.25 text-center text-[10px] leading-2.5 font-medium text-jumpa-primary-950">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

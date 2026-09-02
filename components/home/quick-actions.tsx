import Link from "next/link";
import { ArrowSortIcon } from "@/components/ui/icons/arrow-sort";
import { ComputerIcon } from "@/components/ui/icons/computer";
import { FlashIcon } from "@/components/ui/icons/flash";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { HomeSection } from "./home-section";

/** One pastel per utility, straight off the design. */
const ACTIONS = [
  {
    label: "Airtime",
    href: "/airtime",
    Icon: MobileIcon,
    tile: "bg-jumpa-tile-sky text-jumpa-tile-sky-ink",
  },
  {
    label: "Data",
    href: "/data",
    Icon: ArrowSortIcon,
    tile: "bg-jumpa-tile-rose text-jumpa-tile-rose-ink",
  },
  {
    label: "Electricity",
    href: "/electricity",
    Icon: FlashIcon,
    tile: "bg-jumpa-tile-violet text-jumpa-tile-violet-ink",
  },
  {
    label: "TV",
    href: "/tv",
    Icon: ComputerIcon,
    tile: "bg-jumpa-tile-peach text-jumpa-tile-peach-ink",
  },
];

/** Shortcut tiles to the bill-payment areas. */
export function QuickActions() {
  return (
    <HomeSection title="Quick Actions">
      <ul className="flex items-center justify-center gap-10 rounded-panel bg-jumpa-white px-8.75 py-5">
        {ACTIONS.map(({ label, href, Icon, tile }) => (
          <li key={label}>
            <Link
              href={href}
              className="tap flex w-11 flex-col items-center gap-1.5 active:scale-95"
            >
              <span
                className={`flex size-11 items-center justify-center rounded-full ${tile}`}
              >
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

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { BankIcon } from "@/components/ui/icons/bank";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";

type ReceiveOption = {
  id: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  href: string;
};

/** The two ways money comes in. Order and copy come from the design. */
export const RECEIVE_OPTIONS: ReceiveOption[] = [
  { id: "fiat", Icon: BankIcon, title: "Deposit Fiat", href: "/receive/fiat" },
  {
    id: "crypto",
    Icon: CoinFrontIcon,
    title: "Deposit Crypto",
    href: "/receive/crypto",
  },
];

/** The chooser body, so the sheet and the standalone screen cannot drift. */
export function ReceiveOptionList() {
  return (
    <ul className="flex w-full flex-col gap-2">
      {RECEIVE_OPTIONS.map(({ id, Icon, title, href }) => (
        <li key={id}>
          <Link
            href={href}
            className="tap flex items-center justify-between gap-2 rounded-lg bg-jumpa-neutral-50 px-3 py-4 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
              <span className="text-sm font-medium text-jumpa-black">
                {title}
              </span>
            </span>
            <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

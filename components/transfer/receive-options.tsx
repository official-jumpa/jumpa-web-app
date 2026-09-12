import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { BankIcon } from "@/components/ui/icons/bank";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";

export type ReceiveOptionId = "fiat" | "crypto";

type ReceiveOption = {
  id: ReceiveOptionId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  href: string;
};

/** The two ways money comes in. Order and copy come from the design. */
export const RECEIVE_OPTIONS: ReceiveOption[] = [
  {
    id: "fiat",
    Icon: BankIcon,
    title: "Deposit Fiat",
    href: "/receive?rail=fiat",
  },
  {
    id: "crypto",
    Icon: CoinFrontIcon,
    title: "Deposit Crypto",
    href: "/receive?rail=crypto",
  },
];

/** Row shell, shared so the screen and the sheet cannot drift. The picked mark
 *  is an inset ring rather than a border, so selecting costs no layout. */
export const RECEIVE_ROW =
  "tap flex w-full items-center justify-between gap-2 rounded-lg px-3 py-4 active:scale-[0.99]";
export const RECEIVE_ROW_RESTING = "bg-jumpa-neutral-50";
export const RECEIVE_ROW_PICKED =
  "bg-jumpa-primary-100 inset-ring-1 inset-ring-jumpa-primary-600";

export function ReceiveOptionBody({ id }: { id: ReceiveOptionId }) {
  const option =
    RECEIVE_OPTIONS.find((entry) => entry.id === id) ?? RECEIVE_OPTIONS[0];
  const { Icon, title } = option;

  return (
    <>
      <span className="flex items-center gap-2">
        <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
        <span className="text-sm font-medium text-jumpa-black">{title}</span>
      </span>
      <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
    </>
  );
}

/** The chooser as a list of links, for the standalone Add Money screen. */
export function ReceiveOptionList() {
  return (
    <ul className="flex w-full flex-col gap-2">
      {RECEIVE_OPTIONS.map(({ id, href }) => (
        <li key={id}>
          <Link href={href} className={`${RECEIVE_ROW} ${RECEIVE_ROW_RESTING}`}>
            <ReceiveOptionBody id={id} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

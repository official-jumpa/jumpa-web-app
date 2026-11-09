import type { ComponentType, SVGProps } from "react";
import { OptionRow } from "@/components/transfer/option-row";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { UsersIcon } from "@/components/ui/icons/users";

export type SendOption = {
  id: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  caption: string;
  href: string;
  soon?: boolean;
};

/**
 * The ways out of the wallet. The design's own QR row is gone at the client's
 * ask — scanning is the address field's own action on `/send/wallet` now.
 */
export const SEND_OPTIONS: SendOption[] = [
  {
    id: "address",
    Icon: CircleInformationIcon,
    title: "Paste address",
    caption: "Stellar, Solana, Base",
    href: "/send/wallet",
  },
  {
    id: "bank",
    Icon: ArrowUpRightIcon,
    title: "Via Bank Transfer",
    caption: "Send directly to bank",
    href: "/send/bank",
  },
  {
    id: "jumpa",
    Icon: UsersIcon,
    title: "Send to Jumpa user",
    caption: "Email or Jumpa ID",
    href: "/send/jumpa",
  },
];

/** The chooser body, so the sheet and the standalone screen cannot drift. */
export function SendOptionList({
  options = SEND_OPTIONS,
  onNavigate,
}: {
  options?: SendOption[];
  /** Takes over the links, for a host that keeps its own navigation stack. */
  onNavigate?: (href: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-6 rounded-surface bg-jumpa-neutral-50 px-5 py-4">
      {options.map(({ id, href, ...option }) => (
        <li key={id}>
          <OptionRow
            {...option}
            {...(onNavigate ? { onClick: () => onNavigate(href) } : { href })}
          />
        </li>
      ))}
    </ul>
  );
}

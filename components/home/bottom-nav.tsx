"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { HouseLineIcon } from "@/components/ui/icons/house-line";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "Home", href: "/home", Icon: HouseLineIcon },
  { label: "Cards", href: "/cards", Icon: CreditCardNavIcon },
  { label: "Transactions", href: "/transactions", Icon: ReceiptAltIcon },
  { label: "Me", href: "/profile", Icon: CircleUserIcon },
];

/** Floating tab bar. The chat action sits at the centre, between tabs 2 and 3. */
export function BottomNav() {
  const pathname = usePathname();
  const middle = TABS.length / 2;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-10 mx-auto max-w-app px-4.5 pb-safe">
      <nav className="pointer-events-auto mx-auto flex items-center justify-center h-18.5 gap-1 rounded-pill border border-jumpa-neutral-90 bg-jumpa-white px-2.5">
        {TABS.map(({ label, href, Icon }, index) => (
          <Fragment key={label}>
            {index === middle ? (
              <Link
                href="/home/chat"
                aria-label="Chat"
                className="flex items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-nav-chat)] p-2.5 text-jumpa-alt-400"
              >
                <MessageCircleDotsIcon className="size-6" />
              </Link>
            ) : null}

            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-pill px-2 py-1.5",
                pathname === href
                  ? "text-jumpa-primary-950"
                  : "text-jumpa-grey-500",
              )}
            >
              <Icon className="size-6" />
              <span className="text-[8px] leading-3 font-medium whitespace-nowrap">
                {label}
              </span>
            </Link>
          </Fragment>
        ))}
      </nav>
    </div>
  );
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CircleUserSolidIcon } from "@/components/ui/icons/circle-user-solid";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { CreditCardNavSolidIcon } from "@/components/ui/icons/credit-card-nav-solid";
import { HouseLineIcon } from "@/components/ui/icons/house-line";
import { HouseLineOutlineIcon } from "@/components/ui/icons/house-line-outline";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { ReceiptAltSolidIcon } from "@/components/ui/icons/receipt-alt-solid";
import { type NavTab, TabBar } from "./tab-bar";

/** The app's tabs by name; the Nimiq mini app reuses them with its own hrefs. */
export const APP_TABS = {
  home: {
    label: "Home",
    width: "w-13.25",
    href: "/home",
    Icon: HouseLineOutlineIcon,
    ActiveIcon: HouseLineIcon,
  },
  cards: {
    label: "Cards",
    width: "w-13.25",
    href: "/cards",
    Icon: CreditCardNavIcon,
    ActiveIcon: CreditCardNavSolidIcon,
    soon: true,
  },
  txn: {
    label: "Txn",
    width: "w-9.75",
    href: "/transactions",
    Icon: ReceiptAltIcon,
    ActiveIcon: ReceiptAltSolidIcon,
  },
  me: {
    label: "Me",
    width: "w-12.25",
    href: "/profile",
    Icon: CircleUserIcon,
    ActiveIcon: CircleUserSolidIcon,
  },
} satisfies Record<string, NavTab>;

const TABS: NavTab[] = [
  APP_TABS.home,
  APP_TABS.cards,
  APP_TABS.txn,
  APP_TABS.me,
];

/** The app's tab bar, shown on the tab roots only. */
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only render on primary tab roots, not inside modal-like subflows (e.g. chat, tx-detail, notifications).
  const isTabRoute =
    pathname === "/home" ||
    (pathname === "/transactions" &&
      !searchParams?.get("id") &&
      !searchParams?.get("statement")) ||
    (pathname === "/profile" && !searchParams?.get("view"));

  if (!isTabRoute) {
    return null;
  }

  return <TabBar tabs={TABS} current={pathname} chatHref="/home/chat" />;
}

/**
 * ==============================================================================
 * ARCHIVED: PREVIOUS FLAT OPAQUE IMPLEMENTATION
 * Kept commented out for designer reference
==============================================================================
 *
 * export function FlatBottomNav() {
 *   const pathname = usePathname();
 *   const searchParams = useSearchParams();
 *
 *   const isTabRoute =
 *     pathname === "/home" ||
 *     (pathname === "/transactions" &&
 *       !searchParams?.get("id") &&
 *       !searchParams?.get("statement")) ||
 *     pathname === "/profile";
 *
 *   if (!isTabRoute) {
 *     return null;
 *   }
 *
 *   const middle = TABS.length / 2;
 *
 *   return (
 *     <>
 *       <div aria-hidden="true" className={CLEARANCE} />
 *
 *       <div className="pointer-events-none fixed inset-x-0 bottom-5 z-10 mx-auto max-w-app px-4.5 pb-safe">
 *         <nav className="pointer-events-auto mx-auto flex items-center justify-center h-18.5 gap-1 rounded-pill border border-jumpa-neutral-90 bg-jumpa-white px-2.5">
 *           {TABS.map(({ label, href, Icon, ActiveIcon, soon }, index) => {
 *             const active = pathname === href;
 *             const Glyph = active ? ActiveIcon : Icon;
 *
 *             return (
 *               <Fragment key={label}>
 *                 {index === middle ? (
 *                   <Link
 *                     href="/home/chat"
 *                     prefetch={true}
 *                     aria-label="Chat"
 *                     onClick={() => triggerHaptic("light")}
 *                     className="flex items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-nav-chat)] p-2.5 text-jumpa-alt-400 active:scale-90 transition-transform duration-75"
 *                   >
 *                     <MessageCircleDotsIcon className="size-6" />
 *                   </Link>
 *                 ) : null}
 *
 *                 {soon ? (
 *                   <span
 *                     aria-disabled="true"
 *                     className={cn(
 *                       TAB,
 *                       "cursor-not-allowed select-none text-jumpa-grey-500",
 *                     )}
 *                   >
 *                     <span className="relative">
 *                       <Glyph className={cn("size-6", SOON)} />
 *                       <span
 *                         aria-hidden="true"
 *                         className="absolute -top-1 -right-1.5 rounded-pill bg-jumpa-neutral-95 px-1 py-px text-[6px] leading-2 font-semibold tracking-jumpa-wide text-jumpa-neutral-450 uppercase"
 *                       >
 *                         Soon
 *                       </span>
 *                     </span>
 *                     <span className={cn(LABEL, SOON)}>{label}</span>
 *                     <span className="sr-only">Coming soon</span>
 *                   </span>
 *                 ) : (
 *                   <Link
 *                     href={href}
 *                     prefetch={true}
 *                     onClick={() => triggerHaptic("light")}
 *                     aria-current={active ? "page" : undefined}
 *                     className={cn(
 *                       TAB,
 *                       "active:scale-90 transition-transform duration-75",
 *                       active ? "text-jumpa-primary-950" : "text-jumpa-grey-500",
 *                     )}
 *                   >
 *                     <Glyph
 *                       className={cn(
 *                         "size-6",
 *                         active && "text-jumpa-primary-600",
 *                       )}
 *                     />
 *                     <span className={LABEL}>{label}</span>
 *                   </Link>
 *                 )}
 *               </Fragment>
 *             );
 *           })}
 *         </nav>
 *       </div>
 *     </>
 *   );
 * }
 * ==============================================================================
 */

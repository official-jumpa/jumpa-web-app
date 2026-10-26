"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CircleUserSolidIcon } from "@/components/ui/icons/circle-user-solid";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { CreditCardNavSolidIcon } from "@/components/ui/icons/credit-card-nav-solid";
import { HouseLineIcon } from "@/components/ui/icons/house-line";
import { HouseLineOutlineIcon } from "@/components/ui/icons/house-line-outline";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { ReceiptAltSolidIcon } from "@/components/ui/icons/receipt-alt-solid";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/haptics";

/**
 * A tab draws its stroked glyph at rest and the filled cut on the page it is on.
 * `soon` mutes one and takes it out of the tab order — drop it to go live.
 */
const TABS = [
  {
    label: "Home",
    href: "/home",
    Icon: HouseLineOutlineIcon,
    ActiveIcon: HouseLineIcon,
  },
  {
    label: "Cards",
    href: "/cards",
    Icon: CreditCardNavIcon,
    ActiveIcon: CreditCardNavSolidIcon,
    soon: true,
  },
  {
    label: "History",
    href: "/transactions",
    Icon: ReceiptAltIcon,
    ActiveIcon: ReceiptAltSolidIcon,
  },
  {
    label: "Me",
    href: "/profile",
    Icon: CircleUserIcon,
    ActiveIcon: CircleUserSolidIcon,
  },
];

/**
 * What the floating bar occupies: 20px off the bottom + its own 74px + the safe
 * inset, plus 20px so the last row clears it rather than sitting against it.
 * Rendered in flow beside the bar, so no screen has to know this number.
 */
const CLEARANCE = "h-[calc(env(safe-area-inset-bottom)+114px)]";

/** One box for both branches, so a muted tab is exactly as wide as a live one. */
const TAB = "flex flex-1 flex-col items-center gap-0.5 rounded-pill px-2 py-1.5";
const LABEL = "text-[8px] leading-3 font-medium whitespace-nowrap";
/** Muted, not recoloured — the tab keeps its own glyph so it still reads as Cards. */
const SOON = "opacity-50 blur-[0.4px]";

/**
 * Liquid Glass Floating Navigation Bar.
 *
 * Combines translucent optical glass highlights with:
 * - Equal distribution across navigation items (flex-1 basis-0)
 * - Solid glyph switching on active state
 * - "Soon" badge for inactive/staged features (Cards)
 * - Optical lens indentation for active pill
 */
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only render on primary tab roots, not inside modal-like subflows (e.g. chat, tx-detail, notifications).
  const isTabRoute =
    pathname === "/home" ||
    (pathname === "/transactions" &&
      !searchParams?.get("id") &&
      !searchParams?.get("statement")) ||
    pathname === "/profile";

  if (!isTabRoute) {
    return null;
  }

  const middle = TABS.length / 2;

  return (
    <>
      <div aria-hidden="true" className={CLEARANCE} />

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 mx-auto max-w-app px-4 pb-safe">
        <nav className="pointer-events-auto relative mx-auto flex h-17 max-w-[370px] items-center justify-between gap-1 rounded-full border border-white/80 bg-white/70 p-1.5 px-2 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.03),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1px_1px_rgba(255,255,255,0.4)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-[180%]">
          {TABS.map(({ label, href, Icon, ActiveIcon, soon }, index) => {
            const active = pathname === href;
            const Glyph = active ? ActiveIcon : Icon;

            return (
              <Fragment key={label}>
                {index === middle ? (
                  <div className="flex shrink-0 items-center justify-center px-1">
                    <Link
                      href="/home/chat"
                      prefetch={true}
                      aria-label="Chat"
                      onClick={() => triggerHaptic("light")}
                      className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[image:var(--gradient-jumpa-nav-chat)] text-jumpa-alt-400 shadow-[0_4px_14px_rgba(143,18,255,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.6),inset_0_-1.5px_1px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-105 active:scale-90"
                    >
                      <MessageCircleDotsIcon className="size-5.5" />
                    </Link>
                  </div>
                ) : null}

                {soon ? (
                  <div
                    aria-disabled="true"
                    className="flex flex-1 basis-0 cursor-not-allowed select-none flex-col items-center justify-center gap-0.5 rounded-full py-1 text-neutral-400"
                  >
                    <span className="relative">
                      <Glyph className={cn("size-5", SOON)} />
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-2.5 rounded-pill bg-white/95 px-1 py-px text-[6px] leading-2 font-semibold tracking-jumpa-wide text-jumpa-neutral-450 uppercase shadow-xs border border-black/[0.06]"
                      >
                        Soon
                      </span>
                    </span>
                    <span className={cn(LABEL, SOON)}>{label}</span>
                    <span className="sr-only">Coming soon</span>
                  </div>
                ) : (
                  <Link
                    href={href}
                    prefetch={true}
                    onClick={() => triggerHaptic("light")}
                    aria-current={active ? "page" : undefined}
                    className="group relative flex flex-1 basis-0 cursor-pointer items-center justify-center active:scale-95 transition-transform duration-100"
                  >
                    <div
                      className={cn(
                        "flex w-full max-w-[54px] flex-col items-center justify-center gap-0.5 rounded-full py-1.25 transition-all duration-200",
                        active
                          ? "bg-jumpa-primary-500/12 text-jumpa-primary-700 shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.04),inset_0_-1px_1px_rgba(255,255,255,0.8)]"
                          : "text-neutral-600 hover:bg-white/80 hover:text-jumpa-primary-600 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:scale-105 active:scale-95",
                      )}
                    >
                      <Glyph
                        className={cn(
                          "size-5 transition-transform duration-200",
                          active
                            ? "text-jumpa-primary-600"
                            : "text-neutral-600 group-hover:text-jumpa-primary-600",
                        )}
                      />
                      <span
                        className={cn(
                          LABEL,
                          active
                            ? "font-semibold text-jumpa-primary-700"
                            : "font-medium text-neutral-600 group-hover:text-jumpa-primary-600",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  </Link>
                )}
              </Fragment>
            );
          })}
        </nav>
      </div>
    </>
  );
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

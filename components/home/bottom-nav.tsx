"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CircleUserSolidIcon } from "@/components/ui/icons/circle-user-solid";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { CreditCardNavSolidIcon } from "@/components/ui/icons/credit-card-nav-solid";
import { HouseLineIcon } from "@/components/ui/icons/house-line";
import { HouseLineOutlineIcon } from "@/components/ui/icons/house-line-outline";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { ReceiptAltSolidIcon } from "@/components/ui/icons/receipt-alt-solid";
import { SLIDE_GLIDE } from "@/components/ui/slide-slot";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/haptics";

/**
 * A tab draws its stroked glyph at rest and the filled cut on the page it is on.
 * `soon` mutes one and takes it out of the tab order — drop it to go live.
 * `width` is the design's tab box, which is what spaces the tabs out on a phone.
 */
const TABS = [
  {
    label: "Home",
    width: "w-13.25",
    href: "/home",
    Icon: HouseLineOutlineIcon,
    ActiveIcon: HouseLineIcon,
  },
  {
    label: "Cards",
    width: "w-13.25",
    href: "/cards",
    Icon: CreditCardNavIcon,
    ActiveIcon: CreditCardNavSolidIcon,
    soon: true,
  },
  {
    label: "Txn",
    width: "w-9.75",
    href: "/transactions",
    Icon: ReceiptAltIcon,
    ActiveIcon: ReceiptAltSolidIcon,
  },
  {
    label: "Me",
    width: "w-12.25",
    href: "/profile",
    Icon: CircleUserIcon,
    ActiveIcon: CircleUserSolidIcon,
  },
];

/**
 * What the floating bar occupies: 20px off the bottom + its own 75px + the safe
 * inset, plus 20px so the last row clears it rather than sitting against it.
 * Rendered in flow beside the bar, so no screen has to know this number.
 */
const CLEARANCE = "h-[calc(env(safe-area-inset-bottom)+115px)]";

/**
 * One box for every tab, so a muted tab is exactly as wide as a live one.
 * From `sm` the tabs share the bar evenly rather than huddle in the middle.
 */
const TAB =
  "relative isolate flex flex-col items-center gap-0.5 py-1.5 sm:flex-1";
const LABEL = "text-[8px] leading-3 font-medium whitespace-nowrap";

/**
 * The floating tab bar: a white pill of tabs with the open one in a glass
 * circle that glides to the tab tapped, and the chat button beside it. A
 * white fade under both keeps the page from showing through below the bar.
 */
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The tab just tapped, so the circle sets off before the route lands.
  const [tapped, setTapped] = useState<string | null>(null);
  const tabs = useRef<(HTMLElement | null)[]>([]);
  const [glassX, setGlassX] = useState<number | null>(null);

  // Only render on primary tab roots, not inside modal-like subflows (e.g. chat, tx-detail, notifications).
  const isTabRoute =
    pathname === "/home" ||
    (pathname === "/transactions" &&
      !searchParams?.get("id") &&
      !searchParams?.get("statement")) ||
    (pathname === "/profile" && !searchParams?.get("view"));
  const current = tapped ?? pathname;
  const open = isTabRoute ? TABS.findIndex(({ href }) => href === current) : -1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a landed route is the trigger to drop the tap
  useLayoutEffect(() => setTapped(null), [pathname]);

  // Measured rather than computed, since the tab boxes change at `sm`.
  useLayoutEffect(() => {
    const tab = tabs.current[open];
    if (!tab?.parentElement) return;
    const place = () => setGlassX(tab.offsetLeft + tab.offsetWidth / 2);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(tab.parentElement);
    return () => observer.disconnect();
  }, [open]);

  if (!isTabRoute) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className={CLEARANCE} />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 -bottom-2.25 z-20 mx-auto h-[calc(env(safe-area-inset-bottom)+3.5rem)] max-w-app bg-jumpa-white blur-[5px]"
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 mx-auto flex max-w-app items-center gap-5 px-4.5 pb-safe">
        <nav className="pointer-events-auto relative isolate flex h-18.75 flex-1 items-center justify-center gap-3 rounded-pill border border-jumpa-neutral-90 bg-jumpa-white">
          {glassX !== null && open >= 0 ? (
            // The art's own drop shadow pads it; the shift centres the circle on the tab.
            <Image
              src="/images/home/nav-glass.svg"
              alt=""
              width={82}
              height={82}
              style={{ transform: `translateX(calc(${glassX}px - 50%))` }}
              className={cn(
                "pointer-events-none absolute -top-px left-0 -z-10 max-w-none motion-reduce:transition-none",
                SLIDE_GLIDE,
              )}
            />
          ) : null}
          {TABS.map(({ label, width, href, Icon, ActiveIcon, soon }, index) => {
            if (soon) {
              return (
                <span
                  key={label}
                  aria-disabled="true"
                  className={cn(TAB, width)}
                >
                  <span
                    className={cn(
                      "flex flex-col items-center gap-0.5 text-jumpa-grey-500",
                      SOON,
                    )}
                  >
                    <Icon className="size-6" />
                    <span className={LABEL}>{label}</span>
                  </span>
                  <span className="sr-only">(coming soon)</span>
                  <SoonTag className="-top-0.5 left-1/2" />
                </span>
              );
            }

            const active = index === open;
            const Glyph = active ? ActiveIcon : Icon;

            return (
              <Link
                key={label}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                href={href}
                prefetch={true}
                onClick={(event) => {
                  triggerHaptic("light");
                  if (!event.metaKey && !event.ctrlKey) setTapped(href);
                }}
                aria-current={pathname === href ? "page" : undefined}
                className={cn(
                  TAB,
                  width,
                  "tap active:scale-95",
                  active ? "text-jumpa-violet-920" : "text-jumpa-grey-500",
                )}
              >
                <Glyph
                  className={cn("size-6", active && "text-jumpa-primary-600")}
                />
                <span className={LABEL}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/home/chat"
          prefetch={true}
          aria-label="Chat"
          onClick={() => triggerHaptic("light")}
          className="tap pointer-events-auto mr-2.25 flex size-16.75 shrink-0 items-center justify-center rounded-full bg-(image:--gradient-jumpa-nav-chat) text-jumpa-alt-400 active:scale-90"
        >
          <MessageCircleDotsIcon className="size-9" />
        </Link>
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

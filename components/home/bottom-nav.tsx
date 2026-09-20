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

/** A tab draws its stroked glyph at rest and the filled cut on the page it is on. */
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
  },
  {
    label: "Transactions",
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

/** Floating tab bar. The chat action sits at the centre, between tabs 2 and 3. */
export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only render on primary tab roots, not inside modal-like subflows (e.g. chat, tx-detail, notifications).
  // `/cards` is flattened, so its `?view=` steps (new, create, fund, limits) are flows, not the tab.
  const isTabRoute =
    pathname === "/home" ||
    (pathname === "/cards" && !searchParams?.get("view")) ||
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

      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-10 mx-auto max-w-app px-4.5 pb-safe">
        <nav className="pointer-events-auto mx-auto flex items-center justify-center h-18.5 gap-1 rounded-pill border border-jumpa-neutral-90 bg-jumpa-white px-2.5">
          {TABS.map(({ label, href, Icon, ActiveIcon }, index) => {
            const active = pathname === href;
            const Glyph = active ? ActiveIcon : Icon;

            return (
              <Fragment key={label}>
                {index === middle ? (
                  <Link
                    href="/home/chat"
                    prefetch={true}
                    aria-label="Chat"
                    onClick={() => triggerHaptic("light")}
                    className="flex items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-nav-chat)] p-2.5 text-jumpa-alt-400 active:scale-90 transition-transform duration-75"
                  >
                    <MessageCircleDotsIcon className="size-6" />
                  </Link>
                ) : null}

                <Link
                  href={href}
                  prefetch={true}
                  onClick={() => triggerHaptic("light")}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-pill px-2 py-1.5 active:scale-90 transition-transform duration-75",
                    active ? "text-jumpa-primary-950" : "text-jumpa-grey-500",
                  )}
                >
                  {/* The glyph is brand purple where the label is the darker 950. */}
                  <Glyph
                    className={cn("size-6", active && "text-jumpa-primary-600")}
                  />
                  <span className="text-[8px] leading-3 font-medium whitespace-nowrap">
                    {label}
                  </span>
                </Link>
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
 * TODO: NOTE FOR DESIGNER :
 * ==============================================================================
 * Liquid Glass Navigation  Style.
 *
 * Key components of this implementation:
 * 1. Translucency & Refraction:
 *    - `bg-white/60 backdrop-blur-3xl backdrop-saturate-[180%]` allows scrolling
 *      content underneath the floating capsule to blur smoothly.
 * 2. Optical Glass Rim & Specular Highlights:
 *    - Top specular highlight: `inset_0_1.5px_1px_rgba(255,255,255,1)`
 *    - Bottom refraction rim: `inset_0_-1px_1px_rgba(255,255,255,0.35)`
 *    - Outer boundary: `border border-white/80 ring-1 ring-black/[0.05]` to
 *      maintain crisp edge contrast even against solid `#ffffff` page backgrounds.
 * 3. Active State ("Lens Indentation"):
 *    - Built as a concave optical bubble behind the active tab:
 *      `bg-black/[0.08] shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.08),inset_0_-1px_1px_rgba(255,255,255,0.7)]`
 *      with brand purple text & icon (`text-jumpa-primary-600`).
 * 4. Reactive Hover:
 *    - Inactive items gently reveal a liquid lens bubble on cursor hover
 *      (`hover:bg-black/[0.06] hover:text-jumpa-primary-600 hover:scale-105`).
 *
 * Feel free to customize opacities, blur, curvature, or shadows to your own
 * taste / Figma spec whenever you want to test or re-enable this variant!
 * ==============================================================================
 */
export function LiquidGlassBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isTabRoute =
    pathname === "/home" ||
    pathname.startsWith("/cards") ||
    (pathname === "/transactions" && !searchParams?.get("id")) ||
    pathname === "/profile";

  if (!isTabRoute) {
    return null;
  }

  const middle = TABS.length / 2;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 mx-auto max-w-app px-4 pb-safe">
      <nav className="pointer-events-auto relative mx-auto flex h-16.5 items-center justify-between gap-1 rounded-full border border-white/80 bg-white/60 p-1.5 px-3 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.04),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1px_1px_rgba(255,255,255,0.35)] ring-1 ring-black/[0.05] backdrop-blur-3xl backdrop-saturate-[180%]">
        {TABS.map(({ label, href, Icon }, index) => {
          const isActive =
            href === "/home" ? pathname === "/home" : pathname.startsWith(href);

          return (
            <Fragment key={label}>
              {index === middle ? (
                <Link
                  href="/home/chat"
                  prefetch={true}
                  aria-label="Chat"
                  onClick={() => triggerHaptic("light")}
                  className="relative flex size-11 cursor-pointer items-center justify-center rounded-full bg-[image:var(--gradient-jumpa-nav-chat)] text-jumpa-alt-400 shadow-[0_4px_16px_rgba(143,18,255,0.38),inset_0_1.5px_1px_rgba(255,255,255,0.6),inset_0_-1.5px_1px_rgba(0,0,0,0.2)] transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_20px_rgba(143,18,255,0.48),inset_0_1.5px_1px_rgba(255,255,255,0.8)] active:scale-90"
                >
                  <MessageCircleDotsIcon className="size-5.5" />
                </Link>
              ) : null}

              <Link
                href={href}
                prefetch={true}
                onClick={() => triggerHaptic("light")}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full py-2 transition-all duration-200 active:scale-90",
                  isActive
                    ? "bg-black/[0.08] text-jumpa-primary-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.08),inset_0_-1px_1px_rgba(255,255,255,0.7)] hover:bg-black/[0.12] hover:scale-105"
                    : "text-neutral-500 hover:bg-black/[0.06] hover:text-jumpa-primary-600 hover:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),inset_0_-1px_1px_rgba(255,255,255,0.6)] hover:scale-105",
                )}
              >
                <Icon
                  className={cn(
                    "size-5.5 transition-all duration-200 group-hover:scale-110",
                    isActive
                      ? "text-jumpa-primary-600"
                      : "text-neutral-500 group-hover:text-jumpa-primary-600",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] leading-tight tracking-tight transition-all duration-200",
                    isActive
                      ? "font-semibold text-jumpa-primary-600"
                      : "font-medium text-neutral-500 group-hover:font-semibold group-hover:text-jumpa-primary-600",
                  )}
                >
                  {label}
                </span>
              </Link>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}

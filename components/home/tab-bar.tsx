"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ComponentType,
  type SVGProps,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { SLIDE_GLIDE } from "@/components/ui/slide-slot";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/haptics";

/**
 * A tab draws its stroked glyph at rest and the filled cut on the page it is on.
 * `soon` mutes one and takes it out of the tab order — drop it to go live.
 * `width` is the design's tab box, which is what spaces the tabs out on a phone.
 */
export type NavTab = {
  label: string;
  width: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  ActiveIcon: ComponentType<SVGProps<SVGSVGElement>>;
  soon?: boolean;
};

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

const CHAT =
  "pointer-events-auto mr-2.25 flex size-16.75 shrink-0 items-center justify-center rounded-full bg-(image:--gradient-jumpa-nav-chat) text-jumpa-alt-400";

/**
 * The floating tab bar: a white pill of tabs with the open one in a glass
 * circle that glides to the tab tapped, and the chat button beside it. A
 * white fade under both keeps the page from showing through below the bar.
 */
export function TabBar({
  tabs,
  current,
  chatHref,
  onNavigate,
}: {
  tabs: NavTab[];
  /** The href of the screen on show; it picks the open tab. */
  current: string;
  /** Where the chat button goes; `null` shows it muted and tagged Soon. */
  chatHref: string | null;
  /** Routes tab taps through the host, for one that keeps its own navigation stack. */
  onNavigate?: (href: string) => void;
}) {
  // The tab just tapped, so the circle sets off before the route lands.
  const [tapped, setTapped] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const [glassX, setGlassX] = useState<number | null>(null);
  const open = tabs.findIndex(({ href }) => href === (tapped ?? current));

  // biome-ignore lint/correctness/useExhaustiveDependencies: a landed route is the trigger to drop the tap
  useLayoutEffect(() => setTapped(null), [current]);

  // Measured rather than computed, since the tab boxes change at `sm`.
  useLayoutEffect(() => {
    const tab = tabRefs.current[open];
    if (!tab?.parentElement) return;
    const place = () => setGlassX(tab.offsetLeft + tab.offsetWidth / 2);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(tab.parentElement);
    return () => observer.disconnect();
  }, [open]);

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
          {tabs.map(({ label, width, href, Icon, ActiveIcon, soon }, index) => {
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
                  tabRefs.current[index] = node;
                }}
                href={href}
                prefetch={true}
                onClick={(event) => {
                  triggerHaptic("light");
                  if (event.metaKey || event.ctrlKey) return;
                  setTapped(href);
                  if (onNavigate) {
                    event.preventDefault();
                    onNavigate(href);
                  }
                }}
                aria-current={current === href ? "page" : undefined}
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

        {chatHref ? (
          <Link
            href={chatHref}
            prefetch={true}
            aria-label="Chat"
            onClick={() => triggerHaptic("light")}
            className={cn("tap active:scale-90", CHAT)}
          >
            <MessageCircleDotsIcon className="size-9" />
          </Link>
        ) : (
          <span aria-disabled="true" className="pointer-events-auto relative">
            <span className={cn(CHAT, SOON)}>
              <MessageCircleDotsIcon className="size-9" />
            </span>
            <span className="sr-only">Chat (coming soon)</span>
            <SoonTag className="top-0 right-2.25" />
          </span>
        )}
      </div>
    </>
  );
}

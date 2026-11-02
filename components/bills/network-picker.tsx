"use client";

import Image from "next/image";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { TriangleDownIcon } from "@/components/ui/icons/triangle-down";
import { cn } from "@/lib/cn";
import { getNetwork, MOBILE_NETWORKS, type MobileNetwork } from "@/lib/bills";

const DISC = {
  lg: { box: "size-11", mark: "size-6" },
  sm: { box: "size-7", mark: "size-4" },
} as const;

/** Carrier brand disc; MTN and Glo carry their own in the art. */
function Disc({
  network,
  size,
}: {
  network?: MobileNetwork;
  size: keyof typeof DISC;
}) {
  return (
    <span
      style={{ backgroundColor: network?.tint }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-jumpa-neutral-50",
        DISC[size].box,
      )}
    >
      {network ? (
        <Image
          src={network.logo}
          alt=""
          width={44}
          height={44}
          loading="eager"
          className={
            network.tint
              ? cn(DISC[size].mark, "object-contain")
              : "size-full object-cover"
          }
        />
      ) : null}
    </span>
  );
}

/**
 * The carrier disc beside the bill phone field and the list that drops from it.
 * The list stays mounted while closed so its logos are loaded before it opens.
 */
export function NetworkPicker({
  network,
  onChange,
}: {
  network: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const carrier = getNetwork(network);

  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.focus({ preventScroll: true });
    // The trigger sits inside `root`, so tapping it toggles instead of closing and reopening.
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = [
      ...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ];
    const at = options.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    options[(at + step + options.length) % options.length]?.focus();
  };

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-label={
          carrier
            ? `Network: ${carrier.label}. Change network`
            : "Choose network"
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="tap flex items-center gap-1.75 active:scale-95"
      >
        <Disc network={carrier} size="lg" />
        <TriangleDownIcon
          className={cn(
            "size-2.25 text-jumpa-neutral-270 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        ref={list}
        id={listId}
        role="listbox"
        aria-label="Network"
        hidden={!open}
        onKeyDown={onListKey}
        className="absolute top-full left-0 z-20 mt-2 flex w-44 origin-top-left animate-pop-in flex-col rounded-panel bg-jumpa-white p-1.5 shadow-jumpa-toast ring-1 ring-jumpa-black/6"
      >
        {MOBILE_NETWORKS.map((entry) => {
          const active = entry.id === network;
          return (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(entry.id);
                close();
              }}
              className={cn(
                "tap flex h-11 w-full items-center gap-2.5 rounded-tile px-2.5 text-left text-sm leading-none font-medium tracking-jumpa-snug text-jumpa-ink outline-none",
                active
                  ? "bg-jumpa-primary-50"
                  : "hover:bg-jumpa-neutral-50 focus-visible:bg-jumpa-neutral-50",
              )}
            >
              <Disc network={entry} size="sm" />
              <span className="flex-1">{entry.label}</span>
              {active ? (
                <CheckIcon className="size-4 text-jumpa-primary-600" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

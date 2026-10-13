"use client";

import { useId, useState } from "react";
import { Art } from "@/components/landing/art";
import { cn } from "@/lib/cn";
import type { FaqItem } from "@/lib/landing";

/** One question open at a time: ruled rows on phones, white cards from `md:`. */
export function FaqAccordion({
  items,
  className,
}: {
  items: readonly FaqItem[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();

  return (
    <ul className={cn("flex flex-col font-inter md:gap-20", className)}>
      {items.map((item, i) => {
        const expanded = open === i;
        const panel = `${id}-${i}`;
        return (
          <li
            key={item.question}
            className="border-jumpa-lavender-250 border-b first:border-t md:rounded-u-20 md:border-0 md:bg-jumpa-white md:px-25 md:py-20"
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panel}
              onClick={() => setOpen(expanded ? null : i)}
              className="flex w-full items-center justify-between gap-12 py-18 text-left md:h-44 md:py-0"
            >
              <span className="font-medium text-jumpa-ink text-u-14/21.75 -tracking-u-0.5 md:text-u-18/28">
                {item.question}
              </span>
              <Art
                src="/images/landing/faq-toggle.svg"
                className={cn(
                  "size-17 shrink-0 transition-transform duration-300 ease-jumpa md:size-27",
                  expanded ? "rotate-0" : "rotate-180",
                )}
              />
            </button>
            <section
              id={panel}
              aria-label={item.question}
              inert={!expanded}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-jumpa",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <Art
                  src="/images/landing/faq-rule.svg"
                  className="mt-20 hidden h-1 w-548 md:block"
                />
                <p className="pb-18 text-jumpa-ink-muted text-u-14/21.75 -tracking-u-0.5 md:pt-20 md:pb-0 md:text-u-16/24.75">
                  {item.answer}
                </p>
              </div>
            </section>
          </li>
        );
      })}
    </ul>
  );
}

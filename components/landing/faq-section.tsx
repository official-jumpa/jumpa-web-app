"use client";

import { useCallback, useState } from "react";
import { DotGlow } from "@/components/landing/dot-glow";
import { SectionBadge } from "@/components/landing/section-badge";
import { FlashIcon } from "@/components/ui/icons/flash";
import { cn } from "@/lib/cn";
import { FAQ } from "@/lib/landing";

/**
 * FAQ. Each row expands on click to reveal the answer with a smooth height
 * animation via `grid-template-rows`. Only one row open at a time — clicking
 * an open row closes it, clicking another swaps.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section id="faq" className="relative pt-71.25 md:pt-262">
      <div className="relative mx-auto w-393 md:w-1440">
        <DotGlow
          tone="purple"
          className="-left-191 top-330 w-714.5 md:top-754 md:-left-49 md:w-1537.75"
        />

        <div className="mx-auto flex w-320 flex-col items-center gap-40 md:w-1169 md:gap-100">
          <div className="flex w-320 flex-col items-center gap-24">
            <SectionBadge
              variant="disc"
              icon={<FlashIcon />}
              className="text-u-14 md:text-u-16"
            >
              {FAQ.badge}
            </SectionBadge>
            <h2 className="w-302 text-center text-u-40/40 font-medium tracking-jumpa md:w-638 md:text-u-72/74">
              {FAQ.heading}
            </h2>
          </div>

          <ul className="flex w-full flex-col gap-10 px-8 md:gap-24 md:px-0">
            {FAQ.items.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <li
                  key={item.question}
                  className={cn(
                    "rounded-u-30 bg-jumpa-white transition-shadow duration-300",
                    isOpen && "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
                    index >= 5 && "md:hidden",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(index)}
                    className="flex w-full items-center justify-between py-14 pr-20 pl-14 text-left md:p-30"
                  >
                    <span className="flex items-center gap-20 md:gap-23">
                      <span className="flex size-25.25 shrink-0 items-center justify-center rounded-full bg-jumpa-black text-u-8/9 font-medium tracking-jumpa text-jumpa-white md:size-50 md:text-u-16/18">
                        {index + 1}
                      </span>
                      <span className="text-u-12/16 tracking-jumpa md:text-u-20/22 md:font-medium">
                        {item.question}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-25 shrink-0 items-center justify-center rounded-full text-u-14 transition-all duration-300 md:size-40 md:text-u-20",
                        isOpen
                          ? "rotate-45 bg-jumpa-black text-jumpa-white"
                          : "bg-jumpa-neutral-100 text-jumpa-black",
                      )}
                    >
                      +
                    </span>
                  </button>

                  {/* Smooth height animation via grid-template-rows */}
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-10 pr-20 pl-55.25 text-u-10/16 tracking-jumpa text-jumpa-neutral-400 md:pb-30 md:pr-30 md:pl-103 md:text-u-16/24">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

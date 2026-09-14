"use client";

import { useCallback, useRef, useState } from "react";
import { MinusIcon } from "@/components/ui/icons/minus";
import { PlusIcon } from "@/components/ui/icons/plus";
import { FAQS } from "@/lib/support";

/**
 * One question per row, expanding in place with a smooth height animation.
 * A shared open index keeps one row open at a time, as the design draws it.
 */
export function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {FAQS.map(({ question, answer }, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={question}
            className="rounded-panel bg-jumpa-neutral-50 px-5 py-4.5"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="tap flex w-full list-none items-center justify-between gap-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-xs leading-4 font-medium text-jumpa-black">
                {question}
              </span>

              {isOpen ? (
                <span className="flex size-5.25 shrink-0 items-center justify-center rounded-full bg-jumpa-neutral-100 text-jumpa-black">
                  <MinusIcon className="size-4" />
                </span>
              ) : (
                <PlusIcon className="size-6 shrink-0 text-jumpa-black" />
              )}
            </button>

            <FaqAnswer open={isOpen}>{answer}</FaqAnswer>
          </div>
        );
      })}
    </div>
  );
}

/** Smoothly animates the answer height using `grid-template-rows`. */
function FaqAnswer({
  open,
  children,
}: {
  open: boolean;
  children: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div ref={ref} className="overflow-hidden">
        <p className="pt-3.5 border-t border-jumpa-neutral-100 mt-3.5 text-[10px] leading-3.5 text-jumpa-neutral-700">
          {children}
        </p>
      </div>
    </div>
  );
}

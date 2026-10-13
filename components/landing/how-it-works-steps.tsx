"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/landing/art";
import { cn } from "@/lib/cn";
import { HOW_IT_WORKS } from "@/lib/landing";

const STEPS = HOW_IT_WORKS.steps;
const ADVANCE_MS = 6000;

/** Desktop steps: an accordion that walks itself until the visitor picks one. */
export function HowItWorksSteps() {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false);
  const [inView, setInView] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        threshold: 0.4,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keyed on `active` so a step always gets its full hold.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `active` is the trigger.
  useEffect(() => {
    if (picked || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(
      () => setActive((i) => (i + 1) % STEPS.length),
      ADVANCE_MS,
    );
    return () => clearTimeout(timer);
  }, [active, picked, inView]);

  return (
    <>
      <ol
        ref={list}
        className="absolute top-478 left-107 flex w-592.5 flex-col gap-44"
      >
        {STEPS.map((step, i) => {
          const open = i === active;
          return (
            <li key={step.title} className="flex flex-col items-center gap-40">
              <div className="w-515">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`step-${i}`}
                    onClick={() => {
                      setActive(i);
                      setPicked(true);
                    }}
                    className="w-full text-left font-bold text-jumpa-black text-u-32/31 -tracking-u-1.5 hover:text-jumpa-primary-600"
                  >
                    {step.title}
                  </button>
                </h3>
                <div
                  id={`step-${i}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-jumpa",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <p
                    className={cn(
                      "overflow-hidden text-jumpa-black text-u-16/22 -tracking-u-0.25 transition-opacity duration-500",
                      open ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <span className="block pt-25">{step.body}</span>
                  </p>
                </div>
              </div>
              <Art
                src="/images/landing/step-rule.svg"
                className="h-1 w-592.5"
              />
            </li>
          );
        })}
      </ol>

      <div className="absolute top-355 left-819 h-800 w-514 overflow-clip rounded-u-50 bg-jumpa-surface-alt">
        <span
          aria-hidden="true"
          className="absolute top-636 right-[-6.69%] left-[-3.59%] h-223 rounded-full bg-jumpa-primary-50 opacity-28 blur-u-43.25"
        />
        <div className="absolute top-1/2 left-1/2 h-711.25 w-338.5 -translate-1/2">
          {STEPS.map((step, i) => (
            <Image
              key={step.title}
              src={step.image.src}
              width={step.image.width}
              height={step.image.height}
              sizes="(min-width: 1440px) 339px, 24vw"
              alt={
                i === active
                  ? `Jumpa on a phone: ${step.title.toLowerCase()}`
                  : ""
              }
              aria-hidden={i !== active}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-jumpa",
                i === active ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { type FlowCta, FlowScreen } from "./flow-screen";

/** Rhythm, amount, funding. The review that follows is not counted. */
const STEPS = [1, 2, 3] as const;
export type StepNumber = (typeof STEPS)[number];

/** One numbered step: the step chip, the progress rail, then a heading over the step's own content. */
export function StepScreen({
  step,
  title,
  caption,
  onBack,
  cta,
  children,
}: {
  step: StepNumber;
  title: string;
  caption: string;
  onBack: () => void;
  cta: FlowCta;
  children: ReactNode;
}) {
  return (
    <FlowScreen
      onBack={onBack}
      cta={cta}
      aside={
        <span className="rounded-pill bg-jumpa-primary-50 px-3.5 py-1.75 text-xs leading-4 font-semibold tracking-jumpa-snug text-jumpa-primary-950">
          Step {step} of {STEPS.length}
        </span>
      }
    >
      {/* The chip already says the step; the rail only draws it. */}
      <div aria-hidden="true" className="mt-2.75 flex gap-1.5">
        {STEPS.map((mark) => (
          <span
            key={mark}
            className={cn(
              "h-1 flex-1 rounded-full",
              mark <= step ? "bg-jumpa-primary-600" : "bg-jumpa-lavender-150",
            )}
          />
        ))}
      </div>

      <h1 className="mt-6.75 text-[28px] leading-8.5 font-semibold tracking-jumpa-snug text-jumpa-grey-950">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-grey-500">{caption}</p>

      {children}
    </FlowScreen>
  );
}

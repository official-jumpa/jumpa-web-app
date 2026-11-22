import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { cn } from "@/lib/cn";
import {
  REFERRAL_STEPS,
  type ReferralPerspective,
} from "@/lib/referrals/rules";

/** The three steps a friend completes. The first `done` steps show a tick. */
export function ReferralStepList({
  perspective,
  done = 0,
}: {
  perspective: ReferralPerspective;
  done?: number;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {REFERRAL_STEPS.map((step, index) => {
        const complete = index < done;
        const copy = step[perspective];
        return (
          <li key={step.id} className="flex items-start gap-3">
            {complete ? (
              <CircleCheckIcon className="size-6 shrink-0 text-jumpa-success-500" />
            ) : (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50 text-xs leading-3 font-semibold text-jumpa-primary-600">
                {index + 1}
              </span>
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "text-xs leading-4 font-medium",
                  complete ? "text-jumpa-neutral-400" : "text-jumpa-black",
                )}
              >
                {copy.title}
              </span>
              <span className="text-2xs leading-3.5 text-jumpa-neutral-400">
                {copy.body}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

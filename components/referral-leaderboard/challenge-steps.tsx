import { Eyebrow } from "@/components/referral-leaderboard/eyebrow";
import { ArrowLeftRightIcon } from "@/components/ui/icons/arrow-left-right";
import { CircleDollarIcon } from "@/components/ui/icons/circle-dollar";
import { ShieldCheckOutlineIcon } from "@/components/ui/icons/shield-check-outline";
import { TrophyIcon } from "@/components/ui/icons/trophy";
import { UserPlusIcon } from "@/components/ui/icons/user-plus";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

// In `REFERRAL_CHALLENGE.steps.items` and `.strip` order.
const STEP_ICONS = [
  UserPlusIcon,
  ShieldCheckOutlineIcon,
  ArrowLeftRightIcon,
] as const;
const STRIP_ICONS = [CircleDollarIcon, TrophyIcon] as const;

/** The three numbered step cards. Also used by the landing page's referral section. */
export function StepCards() {
  return (
    <ol className="flex w-354 flex-col gap-19 md:w-auto md:flex-row md:gap-30">
      {REFERRAL_CHALLENGE.steps.items.map((step, index) => {
        const Icon = STEP_ICONS[index];
        return (
          <li
            key={step.title}
            className="relative flex h-118 items-start gap-17 rounded-u-28 bg-jumpa-primary-50 px-19 pt-25 text-left md:h-270 md:w-380 md:flex-col md:gap-0 md:rounded-u-32 md:bg-jumpa-surface md:px-32 md:pt-32"
          >
            <span className="flex size-52 shrink-0 items-center justify-center rounded-u-18 bg-linear-to-r from-jumpa-primary-450 to-jumpa-primary-600 text-jumpa-alt-400 md:size-60 md:rounded-u-20">
              <Icon className="size-26 md:size-28" />
            </span>
            <span
              aria-hidden="true"
              className="absolute top-17 right-20 font-extrabold text-jumpa-primary-175 text-u-36/42 -tracking-u-0.75 md:top-30 md:right-32 md:text-u-48/56 md:-tracking-u-1"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="mt-2 min-w-0 md:mt-36">
              <h3 className="font-bold text-jumpa-ink text-u-18/24 -tracking-u-0.5 md:text-u-24/30 md:-tracking-u-0.25">
                {step.title}
              </h3>
              <p className="mt-6 w-246 text-jumpa-ink-muted text-u-14/21 -tracking-u-0.25 md:mt-10 md:w-316 md:text-u-16/25 md:-tracking-u-0.25">
                {step.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "How it works": heading, step cards and the rules strip. */
export function ChallengeSteps() {
  const { steps, strip } = REFERRAL_CHALLENGE;
  return (
    <section
      id="how-it-works"
      className="mx-auto flex w-402 scroll-mt-65 flex-col items-center pt-50 pb-38 text-center md:w-1440 md:scroll-mt-95 md:pt-76 md:pb-53"
    >
      <Eyebrow>{steps.eyebrow}</Eyebrow>
      <h2 className="mt-8 w-354 font-extrabold text-jumpa-ink text-u-34/40 -tracking-u-0.5 md:mt-10 md:w-900 md:text-u-46/54">
        {steps.heading}{" "}
        <span className="text-jumpa-primary-600">{steps.highlight}</span>
      </h2>
      <p className="mt-8 w-320 text-jumpa-ink-muted text-u-16/24 -tracking-u-0.25 md:mt-12 md:w-640 md:text-u-18/28 md:tracking-normal">
        {steps.subhead}
      </p>

      <div className="mt-46 md:mt-44">
        <StepCards />
      </div>

      <ul className="mt-52 flex w-354 flex-col rounded-u-28 bg-linear-to-r from-jumpa-primary-450 to-jumpa-primary-600 py-12 md:mt-28 md:h-76 md:w-1200 md:flex-row md:items-center md:rounded-u-24 md:py-0">
        {strip.map((item, index) => {
          const Icon = STRIP_ICONS[index];
          return (
            <li
              key={item}
              className="mx-24 flex h-52 items-center gap-16 border-jumpa-white/25 text-left font-semibold text-jumpa-white text-u-15/24 not-first:border-t md:mx-0 md:h-32 md:flex-1 md:justify-center md:gap-14 md:not-first:border-t-0 md:not-first:border-l"
            >
              <Icon className="size-22 shrink-0 text-jumpa-alt-400" />
              {item}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

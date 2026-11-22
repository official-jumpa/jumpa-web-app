import { Eyebrow } from "@/components/referral-leaderboard/eyebrow";
import { ArrowsExchangeIcon } from "@/components/ui/icons/arrows-exchange";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { TrophyIcon } from "@/components/ui/icons/trophy";
import { UserPlusIcon } from "@/components/ui/icons/user-plus";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

// In `REFERRAL_CHALLENGE.steps.items` and `.strip` order.
const STEP_ICONS = [UserPlusIcon, ShieldCheckIcon, ArrowsExchangeIcon] as const;
const STRIP_ICONS = [CoinFrontIcon, TrophyIcon] as const;

/** The three numbered step cards. Also used by the landing page's referral section. */
export function StepCards() {
  return (
    <ol className="flex w-362 flex-col gap-12 md:w-1197 md:flex-row md:gap-33">
      {REFERRAL_CHALLENGE.steps.items.map((step, index) => {
        const Icon = STEP_ICONS[index];
        return (
          <li
            key={step.title}
            className="relative flex flex-col rounded-u-18 border-u-1 border-jumpa-lavender-200 bg-jumpa-surface p-22 text-left md:h-269 md:flex-1 md:rounded-u-24 md:p-31"
          >
            <span className="flex size-48 items-center justify-center rounded-u-12 bg-linear-to-br from-jumpa-primary-600 to-jumpa-primary-400 text-jumpa-white md:size-60 md:rounded-u-14">
              <Icon className="size-24 md:size-28" />
            </span>
            <span
              aria-hidden="true"
              className="absolute top-20 right-22 font-bold text-jumpa-primary-200 text-u-36/42 md:top-26 md:right-28 md:text-u-46/54"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-20 font-semibold text-jumpa-ink text-u-18/24 -tracking-u-0.25 md:mt-38 md:text-u-24/30 md:-tracking-u-0.5">
              {step.title}
            </h3>
            <p className="mt-8 text-jumpa-ink-muted text-u-14/21 md:mt-10 md:text-u-16/24">
              {step.body}
            </p>
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
      className="mx-auto flex w-402 scroll-mt-65 flex-col items-center pt-56 pb-56 text-center md:w-1440 md:scroll-mt-95 md:pt-87 md:pb-108"
    >
      <Eyebrow>{steps.eyebrow}</Eyebrow>
      <h2 className="mt-10 font-bold text-jumpa-ink text-u-28/34 -tracking-u-1 md:mt-14 md:text-u-45/54 md:-tracking-u-1.5">
        {steps.heading}{" "}
        <span className="text-jumpa-primary-600">{steps.highlight}</span>
      </h2>
      <p className="mt-8 w-362 text-jumpa-ink-muted text-u-15/22 md:mt-12 md:w-auto md:text-u-18/26">
        {steps.subhead}
      </p>

      <div className="mt-28 md:mt-50">
        <StepCards />
      </div>

      <ul className="mt-16 flex w-362 flex-col gap-12 rounded-u-16 bg-linear-to-r from-jumpa-primary-600 to-jumpa-primary-500 px-20 py-16 md:mt-28 md:h-76 md:w-1200 md:flex-row md:items-center md:gap-0 md:px-0 md:py-0">
        {strip.map((item, index) => {
          const Icon = STRIP_ICONS[index];
          return (
            <li
              key={item}
              className="flex items-center gap-10 font-semibold text-jumpa-white text-u-13/18 md:h-34 md:flex-1 md:justify-center md:text-u-15/20 md:not-first:border-jumpa-white/25 md:not-first:border-l"
            >
              <Icon className="size-18 shrink-0 text-jumpa-alt-400 md:size-20" />
              {item}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

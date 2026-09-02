import type { SavingsIntro } from "@/components/savings/savings-intro-sheet";
import { CIRCLE_TERMS, SAVINGS_TERMS, type SavingsKind } from "@/lib/savings";

/** Copy is the design's own, including the CTA wording. */
export const SAVINGS_INTROS: Record<SavingsKind, SavingsIntro> = {
  individual: {
    art: "/images/savings/individual-intro.svg",
    width: 149,
    height: 127,
    title: "Individual Savings",
    body: "Save at your own pace. Set a personal target and work towards it consistently.",
    terms: SAVINGS_TERMS,
    cta: "Create a new target",
    href: "/savings/individual",
  },
  lock: {
    art: "/images/savings/lock-intro.svg",
    width: 122,
    height: 134,
    title: "Lock savings",
    body: "Build towards your future. Keep your money secured until you reach your goal.",
    terms: SAVINGS_TERMS,
    cta: "Proceed to lock",
    href: "/savings/lock",
  },
  circle: {
    art: "/images/savings/circle-intro.svg",
    width: 140,
    height: 133,
    title: "Circle",
    body: "Save together. Stay accountable. Build towards a shared goal with your squad.",
    terms: CIRCLE_TERMS,
    cta: "Create a new circle",
    href: "/savings/circles",
  },
};

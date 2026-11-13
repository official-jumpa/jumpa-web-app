import { type ReactNode, useState } from "react";
import { useNgnAccount } from "@/hooks/use-ngn-account";
import {
  type AutoSaveDraft,
  type AutoSaveRule,
  type SourceBalances,
  startDraft,
} from "@/lib/savings-auto-save";
import type { SavingsGoal } from "@/lib/savings-hub";
import { FundingStep } from "./funding-step";
import { ReviewStep } from "./review-step";
import { RhythmStep } from "./rhythm-step";
import { StashStep } from "./stash-step";

/** In the order they are walked. The steps share one URL, so Back is a handler. */
const STEPS = ["rhythm", "stash", "funding", "review"] as const;
type Step = (typeof STEPS)[number];

/**
 * Sets up a plan's auto-save, or changes the one it has: rhythm, amount,
 * wallet, then a review. It only collects the rule; `onSubmit` decides what
 * confirming it takes.
 */
export function AutoSaveFlow({
  goal,
  rule,
  onExit,
  onSubmit,
}: {
  goal: SavingsGoal;
  /** The plan's current rule, when this is a change rather than a first setup. */
  rule?: AutoSaveRule;
  /** Back from the first step. */
  onExit: () => void;
  onSubmit: (draft: AutoSaveDraft) => void;
}) {
  const [step, setStep] = useState<Step>("rhythm");
  const [draft, setDraft] = useState<AutoSaveDraft>(
    () => rule ?? startDraft(goal),
  );
  const { ngnBalance } = useNgnAccount();
  const balances: SourceBalances = { ngn: ngnBalance ?? undefined };

  const patch = (changes: Partial<AutoSaveDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };
  const index = STEPS.indexOf(step);
  const back = () => (index === 0 ? onExit() : go(STEPS[index - 1]));
  const next = () => go(STEPS[index + 1]);

  let screen: ReactNode;
  if (step === "rhythm") {
    screen = (
      <RhythmStep
        cadence={draft.cadence}
        intervalMinutes={draft.intervalMinutes}
        onChange={(cadence) => patch({ cadence })}
        onIntervalChange={(intervalMinutes) => patch({ intervalMinutes })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "stash") {
    screen = (
      <StashStep
        goal={goal}
        cadence={draft.cadence}
        intervalMinutes={draft.intervalMinutes}
        amount={draft.amount}
        onChange={(amount) => patch({ amount })}
        onBack={back}
        onContinue={next}
      />
    );
  } else if (step === "funding") {
    screen = (
      <FundingStep
        draft={draft}
        balances={balances}
        onChange={(source) => patch({ source })}
        onBack={back}
        onContinue={next}
      />
    );
  } else {
    screen = (
      <ReviewStep
        draft={draft}
        balances={balances}
        editing={Boolean(rule)}
        onChange={patch}
        onBack={back}
        onEditSource={() => go("funding")}
        onConfirm={() => onSubmit(draft)}
      />
    );
  }

  return (
    <div key={step} className="animate-fade">
      {screen}
    </div>
  );
}

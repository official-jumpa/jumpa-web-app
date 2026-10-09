"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CreateGoalForm } from "@/components/savings/hub/create-goal-form";
import { GoalDetail } from "@/components/savings/hub/goal-detail";
import { HubOverview } from "@/components/savings/hub/hub-overview";
import { MomentSheet } from "@/components/savings/hub/moments/moment-sheet";
import { SavingStorySheet } from "@/components/savings/hub/moments/saving-story-sheet";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import type { SavingsKind } from "@/lib/savings";
import {
  closeGoal,
  HUB_CURRENCIES,
  HUB_GOALS,
  type HubCurrency,
  type HubGoal,
  type HubMotion,
  PLAN_TABS,
  type PlanTab,
  slideDirection,
  withDeposit,
} from "@/lib/savings-hub";
import {
  goalMoment,
  type Moment,
  newMoments,
  weeklyStreak,
} from "@/lib/savings-moments";

/** The stages share one URL, so every Back is a handler, not history. */
type Stage =
  | { screen: "hub" }
  | { screen: "detail"; id: string }
  | { screen: "create"; kind: SavingsKind };

/** One sheet at a time over whichever stage is showing. */
type Overlay =
  | { type: "story" }
  | { type: "moment"; moments: Moment[]; celebrate: boolean }
  | null;

/** Long enough for the progress bar to visibly move before anything covers it. */
const CELEBRATE_AFTER_MS = 450;

/**
 * Prototype of a single savings hub (`/savings-1`): every plan in one place,
 * with its detail and the three create forms as stages of the same screen.
 */
export function SavingsOption1View() {
  const [stage, setStage] = useState<Stage>({ screen: "hub" });
  const [currency, setCurrency] = useState<HubCurrency>("NGN");
  // TODO(backend): seeded from placeholder plans — load the user's own from /api/savings.
  const [goals, setGoals] = useState<HubGoal[]>(HUB_GOALS);
  // Lives here, not in the hub, so Back from a closed plan lands on Completed.
  const [tab, setTab] = useState<PlanTab>("active");
  const [intro, setIntro] = useState<SavingsKind | null>(null);
  // Only a switch slides the hub; arriving from another stage just fades.
  const [motion, setMotion] = useState<HubMotion | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const celebrateTimer = useRef<number>(undefined);
  const streak = useMemo(() => weeklyStreak(goals), [goals]);

  useEffect(() => () => window.clearTimeout(celebrateTimer.current), []);

  /** Applies a change and, if it earned anything, celebrates it once the screen has caught up. */
  const commit = (next: HubGoal[]) => {
    const earned = newMoments(goals, next);
    setGoals(next);
    window.clearTimeout(celebrateTimer.current);
    if (earned.length === 0) return;
    celebrateTimer.current = window.setTimeout(
      () => setOverlay({ type: "moment", moments: earned, celebrate: true }),
      CELEBRATE_AFTER_MS,
    );
  };
  const share = (moment: Moment) =>
    setOverlay({ type: "moment", moments: [moment], celebrate: false });

  const go = (next: Stage) => {
    setStage(next);
    setMotion(null);
    window.scrollTo({ top: 0 });
  };
  const switchCurrency = (next: HubCurrency) => {
    if (next === currency) return;
    setMotion({
      direction: slideDirection(HUB_CURRENCIES, currency, next),
      by: "currency",
    });
    setCurrency(next);
  };
  const switchTab = (next: PlanTab) => {
    if (next === tab) return;
    setMotion({ direction: slideDirection(PLAN_TABS, tab, next), by: "tab" });
    setTab(next);
  };
  const toHub = () => go({ screen: "hub" });

  const selected =
    stage.screen === "detail"
      ? goals.find((goal) => goal.id === stage.id)
      : undefined;

  let screen: ReactNode;
  if (stage.screen === "detail" && selected) {
    screen = (
      <GoalDetail
        goal={selected}
        onBack={toHub}
        onTopUp={(amount) =>
          commit(
            goals.map((goal) =>
              goal.id === selected.id ? withDeposit(goal, amount) : goal,
            ),
          )
        }
        // The plan stays on screen as its own record; Back then finds it under Completed.
        onWithdraw={(forfeit) => {
          setGoals((all) => [
            closeGoal(selected, forfeit),
            ...all.filter((goal) => goal.id !== selected.id),
          ]);
          setTab("completed");
          window.scrollTo({ top: 0 });
        }}
        onSaveAgain={() => go({ screen: "create", kind: selected.kind })}
        onShare={() => share(goalMoment(selected))}
      />
    );
  } else if (stage.screen === "create") {
    screen = (
      <CreateGoalForm
        kind={stage.kind}
        currency={currency}
        onBack={toHub}
        onCreate={(goal) => {
          commit([goal, ...goals]);
          setCurrency(goal.currency);
          setTab("active");
          go({ screen: "detail", id: goal.id });
        }}
      />
    );
  } else {
    screen = (
      <HubOverview
        goals={goals.filter((goal) => goal.currency === currency)}
        currency={currency}
        tab={tab}
        motion={motion}
        streak={streak}
        onCurrency={switchCurrency}
        onTab={switchTab}
        onNew={() => go({ screen: "create", kind: "individual" })}
        onStory={() => setOverlay({ type: "story" })}
        onPick={setIntro}
        onOpen={(goal) => go({ screen: "detail", id: goal.id })}
      />
    );
  }

  // Keyed so each stage fades in, a plan closing included; opacity only, or the sheets would shift.
  const key =
    stage.screen === "hub"
      ? "hub"
      : stage.screen === "detail"
        ? `detail-${stage.id}-${selected?.closed ? "closed" : "open"}`
        : `create-${stage.kind}`;

  return (
    <>
      <div key={key} className="animate-fade">
        {screen}
      </div>

      {intro ? (
        <SavingsIntroSheet
          // Join a circle lives on the production route, not in the prototype.
          intro={{ ...SAVINGS_INTROS[intro], secondary: undefined }}
          onClose={() => setIntro(null)}
          onContinue={() => {
            setIntro(null);
            go({ screen: "create", kind: intro });
          }}
        />
      ) : null}

      {overlay?.type === "story" ? (
        <SavingStorySheet
          goals={goals}
          onClose={() => setOverlay(null)}
          onShare={share}
        />
      ) : null}

      {overlay?.type === "moment" ? (
        <MomentSheet
          moments={overlay.moments}
          goals={goals}
          celebrate={overlay.celebrate}
          onClose={() => setOverlay(null)}
          onNextGoal={(kind) => {
            setOverlay(null);
            go({ screen: "create", kind });
          }}
        />
      ) : null}
    </>
  );
}

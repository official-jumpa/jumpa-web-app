"use client";

import { type ReactNode, useState } from "react";
import { CreateGoalForm } from "@/components/savings/hub/create-goal-form";
import { GoalDetail } from "@/components/savings/hub/goal-detail";
import { HubOverview } from "@/components/savings/hub/hub-overview";
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

/** The stages share one URL, so every Back is a handler, not history. */
type Stage =
  | { screen: "hub" }
  | { screen: "detail"; id: string }
  | { screen: "create"; kind: SavingsKind };

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
          setGoals((all) =>
            all.map((goal) =>
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
      />
    );
  } else if (stage.screen === "create") {
    screen = (
      <CreateGoalForm
        kind={stage.kind}
        currency={currency}
        onBack={toHub}
        onCreate={(goal) => {
          setGoals((all) => [goal, ...all]);
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
        onCurrency={switchCurrency}
        onTab={switchTab}
        onNew={() => go({ screen: "create", kind: "individual" })}
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
    </>
  );
}

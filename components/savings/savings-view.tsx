"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "@/components/ui/toast";
import { CreateGoalForm } from "@/components/savings/hub/create-goal-form";
import { GoalDetail } from "@/components/savings/hub/goal-detail";
import { HubOverview } from "@/components/savings/hub/hub-overview";
import { MomentSheet } from "@/components/savings/hub/moments/moment-sheet";
import { SavingStorySheet } from "@/components/savings/hub/moments/saving-story-sheet";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import { JoinCircleView } from "@/components/savings/join-circle-view";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import type { SavingsKind } from "@/lib/savings";
import {
  closeGoal,
  HUB_CURRENCIES,
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
  | { screen: "create"; kind: SavingsKind }
  | { screen: "join-circle" };

/** One sheet at a time over whichever stage is showing. */
type Overlay =
  | { type: "story" }
  | { type: "moment"; moments: Moment[]; celebrate: boolean }
  | null;

/** Action requiring PIN confirmation:
 * - Withdrawals (all currencies)
 * - On-chain USDC creation (when deposit > 0)
 * - On-chain USDC top-ups
 */
type PendingPinAction =
  | {
      type: "create";
      data: {
        kind: SavingsKind;
        name: string;
        targetAmount: number;
        depositAmount: number;
        term?: string;
        currency: HubCurrency;
        circleType?: "save_together" | "shared_pool";
        circleMembers?: number;
      };
    }
  | {
      type: "top_up";
      planId: string;
      amount: number;
    }
  | {
      type: "join";
      code: string;
      amount: number;
      currency: HubCurrency;
    }
  | {
      type: "withdraw";
      planId: string;
      forfeit: boolean;
      amount?: number;
    }
  | null;

/** Long enough for the progress bar to visibly move before anything covers it. */
const CELEBRATE_AFTER_MS = 450;

/**
 * Savings View with NGN and Stellar USDC DeFindex integration.
 */
export function SavingsView() {
  const [stage, setStage] = useState<Stage>({ screen: "hub" });
  const [currency, setCurrency] = useState<HubCurrency>("NGN");
  const [goals, setGoals] = useState<HubGoal[]>([]);
  const [seenIntros, setSeenIntros] = useState<Record<SavingsKind, boolean>>({
    individual: false,
    lock: false,
    circle: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<PlanTab>("active");
  const [intro, setIntro] = useState<SavingsKind | null>(null);
  const [motion, setMotion] = useState<HubMotion | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  // PIN Sheet state (for withdrawals only)
  const [pinAction, setPinAction] = useState<PendingPinAction>(null);
  const [pinPending, setPinPending] = useState(false);
  const [pinError, setPinError] = useState(false);

  const celebrateTimer = useRef<number>(undefined);
  const streak = useMemo(() => weeklyStreak(goals), [goals]);

  // Fetch real plans on mount
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/savings");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.goals)) {
          setGoals(data.goals);
        }
        if (data.seenSavingsIntros) {
          setSeenIntros({
            individual: Boolean(data.seenSavingsIntros.individual),
            lock: Boolean(data.seenSavingsIntros.lock),
            circle: Boolean(data.seenSavingsIntros.circle),
          });
        }
      }
    } catch (err) {
      console.warn("Failed to load savings plans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    return () => window.clearTimeout(celebrateTimer.current);
  }, [fetchPlans]);

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

  // 1. Create Goal (Requires PIN only if USDC with initial deposit > 0)
  const handleCreateGoal = async (
    goalInput: {
      kind: SavingsKind;
      name: string;
      targetAmount: number;
      depositAmount: number;
      term?: string;
      currency: HubCurrency;
      circleType?: "save_together" | "shared_pool";
      circleMembers?: number;
    },
    pin?: string,
  ) => {
    // If USDC and initial deposit > 0 and no PIN entered yet, prompt for PIN
    if (goalInput.currency === "USDC" && goalInput.depositAmount > 0 && !pin) {
      setPinAction({ type: "create", data: goalInput });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/savings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: goalInput.kind,
          name: goalInput.name,
          targetAmount: goalInput.targetAmount,
          depositAmount: goalInput.depositAmount,
          term: goalInput.term,
          currency: goalInput.currency,
          circleType: goalInput.circleType,
          circleMembers: goalInput.circleMembers,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create savings goal");
      }

      toast.success("Savings plan created successfully!");
      setPinAction(null);
      await fetchPlans();
      setCurrency(goalInput.currency);
      setTab("active");
      if (data.plan?.id) {
        go({ screen: "detail", id: data.plan.id });
      } else {
        toHub();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create savings plan");
      if (pinAction) setPinError(true);
    } finally {
      setSubmitting(false);
      setPinPending(false);
    }
  };

  // 2. Top-Up Goal (Requires PIN only for USDC on-chain)
  const handleTopUpGoal = async (planId: string, amount: number, pin?: string) => {
    const goal = goals.find((g) => g.id === planId);
    // If USDC and no PIN yet, prompt for PIN
    if (goal?.currency === "USDC" && !pin) {
      setPinAction({ type: "top_up", planId, amount });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/savings/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          amount,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Deposit failed");
      }

      toast.success("Deposit added successfully!");
      setPinAction(null);
      // Optimistically update
      setGoals((current) =>
        current.map((g) => (g.id === planId ? withDeposit(g, amount) : g)),
      );
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
      if (pinAction) setPinError(true);
    } finally {
      setSubmitting(false);
      setPinPending(false);
    }
  };

  // 3. Withdraw Goal (Always requires PIN)
  const handleWithdrawWithPin = async (
    planId: string,
    amount: number | undefined,
    forfeit: boolean,
    pin: string,
  ) => {
    setPinPending(true);
    setPinError(false);

    try {
      const res = await fetch("/api/savings/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          amount,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      toast.success(
        forfeit
          ? "Withdrawn early. Principal returned to wallet."
          : "Withdrawn successfully!",
      );
      setPinAction(null);
      await fetchPlans();

      // If full withdrawal, show completed tab
      const isFull = !amount || data.plan?.currentAmount === 0;
      if (isFull) {
        setTab("completed");
      }
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      setPinError(true);
    } finally {
      setPinPending(false);
    }
  };

  // 4. Join Circle (Requires PIN only for USDC)
  const handleJoinCircle = async (
    code: string,
    amount: number,
    circleCurrency: HubCurrency,
    pin?: string,
  ) => {
    if (circleCurrency === "USDC" && !pin) {
      setPinAction({ type: "join", code, amount, currency: circleCurrency });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/savings/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join circle");
      }

      toast.success("Joined circle successfully!");
      setPinAction(null);
      await fetchPlans();
      if (data.plan?.id) {
        go({ screen: "detail", id: data.plan.id });
      } else {
        toHub();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to join circle");
      if (pinAction) setPinError(true);
    } finally {
      setSubmitting(false);
      setPinPending(false);
    }
  };

  // Unified PIN Submission Handler
  const handlePinSubmit = async (pin: string) => {
    if (!pinAction) return;
    setPinPending(true);
    setPinError(false);

    if (pinAction.type === "create") {
      await handleCreateGoal(pinAction.data, pin);
    } else if (pinAction.type === "top_up") {
      await handleTopUpGoal(pinAction.planId, pinAction.amount, pin);
    } else if (pinAction.type === "join") {
      await handleJoinCircle(pinAction.code, pinAction.amount, pinAction.currency, pin);
    } else if (pinAction.type === "withdraw") {
      await handleWithdrawWithPin(
        pinAction.planId,
        pinAction.amount,
        pinAction.forfeit,
        pin,
      );
    }
  };

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
        onTopUp={(amount) => {
          handleTopUpGoal(selected.id, amount);
        }}
        onWithdraw={(forfeit, amount) => {
          setPinAction({ type: "withdraw", planId: selected.id, forfeit, amount });
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
          handleCreateGoal({
            kind: goal.kind,
            name: goal.name,
            targetAmount: goal.target,
            depositAmount: goal.saved,
            term: goal.termDays ? `${goal.termDays} DAYS` : undefined,
            currency: goal.currency,
            circleType: goal.circle?.style,
            circleMembers: goal.circle?.capacity,
          });
        }}
      />
    );
  } else if (stage.screen === "join-circle") {
    screen = (
      <JoinCircleView
        onBack={toHub}
        onJoin={(code, amount, circleCurrency) => {
          handleJoinCircle(code, amount, circleCurrency);
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
        onPick={(kind) => {
          if (!seenIntros[kind]) {
            setIntro(kind);
          } else {
            go({ screen: "create", kind });
          }
        }}
        onOpen={(goal) => go({ screen: "detail", id: goal.id })}
      />
    );
  }

  const key =
    stage.screen === "hub"
      ? "hub"
      : stage.screen === "detail"
        ? `detail-${stage.id}-${selected?.closed ? "closed" : "open"}`
        : stage.screen === "create"
          ? `create-${stage.kind}`
          : "join-circle";

  return (
    <>
      <div key={key} className="animate-fade">
        {screen}
      </div>

      {intro ? (
        <SavingsIntroSheet
          intro={
            intro === "circle"
              ? {
                  ...SAVINGS_INTROS.circle,
                  secondary: {
                    label: "Join a circle",
                    href: "#",
                  },
                }
              : { ...SAVINGS_INTROS[intro], secondary: undefined }
          }
          onClose={() => setIntro(null)}
          onContinue={() => {
            const kind = intro;
            setIntro(null);
            setSeenIntros((prev) => ({ ...prev, [kind]: true }));
            fetch(`/api/savings/intro-seen?kind=${kind}`, { method: "POST" }).catch(() => {});
            go({ screen: "create", kind });
          }}
          onSecondary={
            intro === "circle"
              ? () => {
                  setIntro(null);
                  go({ screen: "join-circle" });
                }
              : undefined
          }
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

      {pinAction ? (
        <TransferPinSheet
          pending={pinPending}
          error={pinError}
          pendingLabel={
            pinAction.type === "withdraw"
              ? "Processing withdrawal..."
              : pinAction.type === "create"
                ? "Creating savings plan..."
                : pinAction.type === "join"
                  ? "Joining circle..."
                  : "Depositing..."
          }
          onComplete={handlePinSubmit}
          onRetry={() => setPinError(false)}
          onClose={() => {
            if (!pinPending) {
              setPinAction(null);
              setPinError(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

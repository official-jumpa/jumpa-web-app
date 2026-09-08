import type { ChatPlan } from "@/lib/chat";
import { formatPlanForUI } from "@/lib/savings-service";
import type { ISavingsPlan } from "@/models/SavingsPlan";

/** The pill opposite the name, matching what the savings screens print. */
const KIND_LABEL: Record<ISavingsPlan["kind"], string> = {
  lock: "Locked",
  circle: "Circle",
  individual: "Target",
};

/** "60 days left", or the state that has overtaken the countdown. */
function termOf(plan: ISavingsPlan, status: string, daysLeft: number) {
  if (!plan.endDate) return "No deadline";
  if (status !== "Active") return status;
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}

/**
 * One saved plan in the shape the chat draws it. It goes through
 * `formatPlanForUI`, so a plan reads the same in the transcript as it does on
 * the savings screens and the two can never disagree.
 */
export function toChatPlan(plan: ISavingsPlan, reply: string): ChatPlan {
  const ui = formatPlanForUI(plan);

  return {
    id: ui.id,
    name: ui.name,
    kind: KIND_LABEL[ui.kind] ?? KIND_LABEL.individual,
    category: plan.category,
    saved: ui.saved,
    target: ui.target,
    percent: ui.percent,
    term: termOf(plan, ui.status, ui.daysLeft),
    reply,
  };
}

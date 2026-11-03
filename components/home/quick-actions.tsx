import { ActionGrid } from "./action-grid";
import type { AppActionId } from "./actions";
import { HomeSection } from "./home-section";

/** The eight shortcuts Home shows, in the design's order; More lists the rest. */
const HOME_ACTIONS: AppActionId[] = [
  "savings",
  "invest",
  "data",
  "airtime",
  "referral",
  "bill",
  "lending",
  "more",
];

/** Two rows of shortcut tiles under the banner. */
export function QuickActions() {
  return (
    <HomeSection title="Quick Actions" className="gap-2.5">
      <ActionGrid actions={HOME_ACTIONS} />
    </HomeSection>
  );
}

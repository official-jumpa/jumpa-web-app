import { ActionTile } from "./action-tile";
import { APP_ACTIONS, type AppAction, type AppActionId } from "./actions";

/** A grey panel of shortcut tiles, four to a row. */
export function ActionGrid({
  actions,
  onSheet,
  onNavigate,
}: {
  /** App shortcuts by id, or a host's own (the Nimiq mini app's). */
  actions: (AppActionId | AppAction)[];
  onSheet?: (sheet: "send" | "receive") => void;
  /** Takes over route tiles, for a host that keeps its own navigation stack. */
  onNavigate?: (href: string) => void;
}) {
  return (
    <ul className="grid grid-cols-4 justify-items-center gap-y-3.5 rounded-panel bg-jumpa-neutral-50 px-2.75 pt-5 pb-6.75">
      {actions.map((entry) => {
        const action = typeof entry === "string" ? APP_ACTIONS[entry] : entry;
        return (
          <li key={action.label}>
            <ActionTile
              action={action}
              onSheet={onSheet}
              onNavigate={onNavigate}
            />
          </li>
        );
      })}
    </ul>
  );
}

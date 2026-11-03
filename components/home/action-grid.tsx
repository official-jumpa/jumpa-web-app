import { ActionTile } from "./action-tile";
import { APP_ACTIONS, type AppActionId } from "./actions";

/** A grey panel of shortcut tiles, four to a row. */
export function ActionGrid({
  actions,
  onSheet,
}: {
  actions: AppActionId[];
  onSheet?: (sheet: "send" | "receive") => void;
}) {
  return (
    <ul className="grid grid-cols-4 justify-items-center gap-y-3.5 rounded-panel bg-jumpa-neutral-50 px-2.75 pt-5 pb-6.75">
      {actions.map((id) => (
        <li key={id}>
          <ActionTile action={APP_ACTIONS[id]} onSheet={onSheet} />
        </li>
      ))}
    </ul>
  );
}

import type { SavingsKind } from "@/lib/savings";
import {
  MILESTONE_LABEL,
  MILESTONES,
  type Milestone,
} from "@/lib/savings-moments";

/** A node's resting box; reached ones light after the fill has had time to get there. */
const NODE =
  "absolute top-1/2 size-3 -translate-y-1/2 rounded-full ring-2 ring-jumpa-primary-600 transition-colors delay-300 duration-300 ease-jumpa";

/**
 * The hero's meter with its four milestones on it. The last node and label sit
 * inside the bar's end rather than centred on it, so nothing pokes past the hero.
 */
export function MilestoneTrack({
  progress,
  reached,
  kind,
}: {
  /** 0–100. */
  progress: number;
  reached: Milestone | 0;
  kind: SavingsKind;
}) {
  const label = (mark: Milestone) =>
    mark === 100 && kind === "lock" ? "Unlock" : MILESTONE_LABEL[mark];

  return (
    <span className="flex flex-col gap-2.5">
      <span aria-hidden="true" className="relative block h-3">
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-pill bg-jumpa-white/20">
          <span
            className="block h-full origin-left animate-meter-fill rounded-pill bg-jumpa-alt-400 transition-[width] duration-500 ease-jumpa"
            style={{ width: `${progress}%` }}
          />
        </span>
        {MILESTONES.map((mark) => (
          <span
            key={mark}
            className={`${NODE} ${mark === 100 ? "-translate-x-full" : "-translate-x-1/2"} ${
              mark <= reached ? "bg-jumpa-alt-400" : "bg-jumpa-primary-300"
            }`}
            style={{ left: `${mark}%` }}
          />
        ))}
      </span>

      <span className="relative block h-3 text-[10px] leading-3">
        {MILESTONES.map((mark) => (
          <span
            key={mark}
            className={`absolute top-0 whitespace-nowrap transition-colors delay-300 duration-300 ${
              mark === 100 ? "-translate-x-full" : "-translate-x-1/2"
            } ${
              mark <= reached
                ? "font-semibold text-jumpa-alt-400"
                : "text-jumpa-primary-100"
            }`}
            style={{ left: `${mark}%` }}
          >
            {label(mark)}
          </span>
        ))}
      </span>
    </span>
  );
}

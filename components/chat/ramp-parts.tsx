import type { ReactNode } from "react";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import { cn } from "@/lib/cn";

/** Shared pieces for the on- and off-ramp checkout cards, so the two stay in step. */

export type RampTone = "pending" | "done" | "error";

const TONE: Record<RampTone, string> = {
  pending: "bg-jumpa-secondary-100 text-jumpa-primary-950",
  done: "bg-jumpa-alt-400 text-jumpa-alt-950",
  error: "bg-jumpa-danger-50 text-jumpa-danger",
};

export function RampShell({
  title,
  status,
  tone,
  children,
}: {
  title: string;
  status: string;
  tone: RampTone;
  children: ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-surface border border-jumpa-neutral-100 bg-jumpa-white shadow-xs">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3.5 pb-3">
        <h3 className="min-w-0 truncate text-[13px] leading-5 font-semibold text-jumpa-black">
          {title}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2 py-0.5 text-[10px] leading-4 font-semibold whitespace-nowrap",
            TONE[tone],
          )}
        >
          {status}
        </span>
      </div>
      <span aria-hidden="true" className="rule-dashed block h-px w-full" />
      <div className="flex flex-col gap-3 p-3.5">{children}</div>
    </div>
  );
}

export function DetailBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-jumpa-neutral-100 bg-jumpa-neutral-50 p-3">
      {children}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[11px] leading-4 text-jumpa-neutral-400">
        {label}
      </span>
      <span className="min-w-0 text-right text-xs leading-4 font-semibold text-jumpa-black">
        {value}
      </span>
    </div>
  );
}

/** Provider notes — instructions, not errors, so they sit on the card's own white. */
/** A note that costs the user money if skipped: the account expires, or takes one payment only. */
const CAUTION = /used once|only once|one[- ]time|expir/i;
/** The words in a caution the eye should land on. */
const STRESS = /(\d+\s*minutes?|(?:can )?only be used once|one[- ]time)/gi;

/** A caution with its key words in bold; `split` puts the matches at odd indexes. */
function stressed(note: string) {
  return note.split(STRESS).map((part, index) =>
    index % 2 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one fixed string never reorder
      <strong key={index} className="font-semibold text-jumpa-black">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/** The provider's notes; a caution leads, on a caution ground, so it isn't skimmed past. */
export function RampNotes({ notes }: { notes: string[] | string }) {
  const list = Array.isArray(notes) ? notes : [notes];
  const items = [
    ...list.filter((note) => CAUTION.test(note)),
    ...list.filter((note) => !CAUTION.test(note)),
  ];
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-jumpa-white px-3 py-2.5">
      {items.map((note) =>
        CAUTION.test(note) ? (
          <p
            key={note}
            className="-mx-1.5 flex gap-1.5 rounded-lg bg-jumpa-warning-50 px-1.5 py-1.5 text-[11px] leading-4 font-medium text-jumpa-neutral-550 inset-ring inset-ring-jumpa-warning/30"
          >
            <TriangleWarningIcon className="mt-0.5 size-3 shrink-0 text-jumpa-warning" />
            <span>{stressed(note)}</span>
          </p>
        ) : (
          <p
            key={note}
            className="flex gap-1.5 text-[11px] leading-4 text-jumpa-neutral-400"
          >
            <CircleInformationIcon className="mt-0.5 size-3 shrink-0" />
            <span>{note}</span>
          </p>
        ),
      )}
    </div>
  );
}

export function RampNotice({
  tone,
  children,
}: {
  tone: "error" | "pending";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-xl px-3 py-2 text-center text-[11px] leading-4 font-medium",
        tone === "error"
          ? "bg-jumpa-danger-50 text-jumpa-danger"
          : "bg-jumpa-white text-jumpa-neutral-400",
      )}
    >
      {children}
    </p>
  );
}

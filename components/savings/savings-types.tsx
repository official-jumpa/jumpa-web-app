"use client";

import type { ComponentType } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { LockIcon } from "@/components/ui/icons/lock";
import { UsersIcon } from "@/components/ui/icons/users";
import { rateRange, type SavingsKind, topRate } from "@/lib/savings";

type KindIcon = ComponentType<{ className?: string }>;

/** One glyph per product, shared by every screen that names one. */
export const KIND_ICON: Record<SavingsKind, KindIcon> = {
  individual: CircleUserIcon,
  lock: LockIcon,
  circle: UsersIcon,
};

type SavingsType = {
  kind: SavingsKind;
  label: string;
  caption: string;
  /** Name and one-line hint for the compact grid, where the full ones wrap. */
  short: string;
  hint: string;
  Icon: KindIcon;
};

const TYPES: SavingsType[] = [
  {
    kind: "individual",
    label: "Individual Savings",
    caption: "Save towards a personal goal at your own pace.",
    short: "Individual",
    hint: "Your own pace",
    Icon: KIND_ICON.individual,
  },
  {
    kind: "lock",
    label: "Lock savings",
    caption: "Lock funds for a fixed term and earn a higher rate.",
    short: "Lock",
    hint: "Fixed term",
    Icon: KIND_ICON.lock,
  },
  {
    kind: "circle",
    label: "Circles (Group Savings)",
    caption: "Create or join a shared savings goal.",
    short: "Circles",
    hint: "With friends",
    Icon: KIND_ICON.circle,
  },
];

const CARD_BASE =
  "tap flex rounded-surface bg-jumpa-primary-50 text-left active:scale-[0.99]";
const CARD = `${CARD_BASE} p-4`;

function TypeIcon({ Icon }: { Icon: SavingsType["Icon"] }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
      <Icon className="size-6" />
    </span>
  );
}

/**
 * Title, the rate the product pays, then what it is for. The rate sits between
 * the two because it is the reason to pick one product over another.
 */
function TypeText({
  label,
  caption,
  kind,
}: {
  label: string;
  caption: string;
  kind: SavingsKind;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-semibold text-jumpa-black">{label}</span>
      <span className="text-xs leading-4 font-semibold text-jumpa-primary-600">
        {rateRange(kind)}
      </span>
      {/* Was 10px on neutral-400 — 3.4:1 against this ground, which is why it
          read as unreadable. 11px on neutral-600 is 8.2:1. */}
      <span className="text-[11px] leading-4 text-jumpa-neutral-600">
        {caption}
      </span>
    </span>
  );
}

/** Three equal tiles: glyph, short name, best rate, one-line hint. */
function TypeGrid({ onSelect }: { onSelect: (kind: SavingsKind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TYPES.map(({ kind, short, hint, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onSelect(kind)}
          className={`${CARD_BASE} min-w-0 flex-col gap-3 p-3`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-950 text-jumpa-primary-50">
            <Icon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm leading-4 font-semibold text-jumpa-black">
              {short}
            </span>
            <span className="text-[11px] leading-4 font-semibold text-jumpa-primary-600">
              Up to {topRate(kind)}
            </span>
            <span className="text-[10px] leading-3.5 text-jumpa-neutral-500">
              {hint}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** The three ways to save. Each one explains itself before it commits you. */
export function SavingsTypes({
  onSelect,
  layout = "stack",
}: {
  onSelect: (kind: SavingsKind) => void;
  /** `grid` is the compact row the savings hub uses. */
  layout?: "stack" | "grid";
}) {
  const [individual, lock, circles] = TYPES;

  if (layout === "grid") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-jumpa-black">Ways to save</h2>
        <TypeGrid onSelect={onSelect} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-jumpa-black">Savings types</h2>

      <div className="flex items-stretch gap-3">
        {[individual, lock].map(({ kind, label, caption, Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onSelect(kind)}
            className={`${CARD} min-w-0 flex-1 flex-col gap-3`}
          >
            <TypeIcon Icon={Icon} />
            <TypeText label={label} caption={caption} kind={kind} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(circles.kind)}
        className={`${CARD} items-center gap-4`}
      >
        <TypeIcon Icon={circles.Icon} />
        <TypeText
          label={circles.label}
          caption={circles.caption}
          kind={circles.kind}
        />
      </button>
    </section>
  );
}

"use client";

import type { ComponentType } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { LockIcon } from "@/components/ui/icons/lock";
import { UsersIcon } from "@/components/ui/icons/users";
import { rateRange, type SavingsKind } from "@/lib/savings";

type SavingsType = {
  kind: SavingsKind;
  label: string;
  caption: string;
  Icon: ComponentType<{ className?: string }>;
};

const TYPES: SavingsType[] = [
  {
    kind: "individual",
    label: "Individual Savings",
    caption: "Save towards a personal goal at your own pace.",
    Icon: CircleUserIcon,
  },
  {
    kind: "lock",
    label: "Lock savings",
    caption: "Lock funds for a fixed term and earn a higher rate.",
    Icon: LockIcon,
  },
  {
    kind: "circle",
    label: "Circles (Groups)",
    caption: "Create or join a shared savings goal.",
    Icon: UsersIcon,
  },
];

const CARD =
  "tap flex rounded-surface bg-jumpa-primary-50 p-4 text-left active:scale-[0.99]";

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

/** The three ways to save. Each one explains itself before it commits you. */
export function SavingsTypes({
  onSelect,
}: {
  onSelect: (kind: SavingsKind) => void;
}) {
  const [individual, lock, circles] = TYPES;

  return (
    <section className="flex flex-col gap-3">
      {/* The frame heads the list "Loan types"; kept verbatim. */}
      <h2 className="text-xs font-medium text-jumpa-black">Loan types</h2>

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

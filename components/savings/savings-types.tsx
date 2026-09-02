"use client";

import type { ComponentType } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { LockAltIcon } from "@/components/ui/icons/lock-alt";
import { UsersIcon } from "@/components/ui/icons/users";
import type { SavingsKind } from "@/lib/savings";

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
    caption: "Save towards something personal.",
    Icon: CircleUserIcon,
  },
  {
    kind: "lock",
    label: "Lock savings",
    caption: "Save towards something personal.",
    Icon: LockAltIcon,
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

function TypeText({ label, caption }: { label: string; caption: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-semibold text-jumpa-black">{label}</span>
      <span className="text-[10px] leading-3.5 text-jumpa-neutral-400">
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
      <h2 className="text-xs font-medium text-jumpa-black">Loan types</h2>

      <div className="flex items-start gap-3">
        {[individual, lock].map(({ kind, label, caption, Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onSelect(kind)}
            className={`${CARD} min-w-0 flex-1 flex-col justify-center gap-3`}
          >
            <TypeIcon Icon={Icon} />
            <TypeText label={label} caption={caption} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(circles.kind)}
        className={`${CARD} items-center gap-4`}
      >
        <TypeIcon Icon={circles.Icon} />
        <TypeText label={circles.label} caption={circles.caption} />
      </button>
    </section>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { GaugeLowIcon } from "@/components/ui/icons/gauge-low";
import { PenLineIcon } from "@/components/ui/icons/pen-line";
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";

function Row({
  label,
  icon,
  badge,
  className,
}: {
  label: string;
  icon: ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-2 text-jumpa-black ${className ?? ""}`}
    >
      {icon}
      <span className="text-xs leading-3.5">{label}</span>
      {badge ? (
        <span className="rounded-pill bg-linear-to-b from-jumpa-alt-300 to-jumpa-alt-400 px-3 py-2 text-[10px] leading-3.5 font-medium text-jumpa-alt-900 inset-ring-1 inset-ring-jumpa-alt-500">
          {badge}
        </span>
      ) : null}
      <ChevronRightIcon className="ml-auto size-5 text-jumpa-black" />
    </span>
  );
}

/** Card settings block. `onDelete` raises the confirm sheet; the row is a button. */
export function CardSettings({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-surface bg-jumpa-neutral-50 px-6 py-5 inset-ring-1 inset-ring-jumpa-neutral-60">
      <Row
        label="Customize your Card"
        badge="Coming Soon"
        className="text-jumpa-neutral-450"
        icon={<PenLineIcon className="size-6 text-jumpa-neutral-450" />}
      />
      <hr className="border-jumpa-neutral-100" />

      <Link prefetch href="/cards?view=limits">
        <Row
          label="Card Limits"
          icon={<GaugeLowIcon className="size-6 text-jumpa-black" />}
        />
      </Link>
      <hr className="border-jumpa-neutral-100" />

      <button type="button" onClick={onDelete}>
        <Row
          label="Delete Card"
          className="text-jumpa-warning"
          icon={<TrashAltIcon className="size-6 text-jumpa-warning" />}
        />
      </button>
    </div>
  );
}

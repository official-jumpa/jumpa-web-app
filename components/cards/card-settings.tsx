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
      <span className="text-xs leading-3.5 font-medium">{label}</span>
      {badge ? (
        <span className="rounded-pill bg-jumpa-alt-400 px-3.25 py-2.25 text-xs leading-3.5 font-medium text-jumpa-alt-950">
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
    <div className="flex flex-col gap-4 rounded-card bg-jumpa-neutral-50 px-6 py-5">
      <Row
        label="Customize your Card"
        badge="Coming Soon"
        icon={<PenLineIcon className="size-6 text-jumpa-neutral-500" />}
      />
      <hr className="border-jumpa-neutral-100" />

      <Link href="/cards/limits">
        <Row
          label="Card Limits"
          icon={<GaugeLowIcon className="size-6 text-jumpa-black" />}
        />
      </Link>
      <hr className="border-jumpa-neutral-100" />

      <button type="button" onClick={onDelete}>
        <Row
          label="Delete Card"
          className="text-jumpa-danger"
          icon={<TrashAltIcon className="size-6 text-jumpa-danger" />}
        />
      </button>
    </div>
  );
}

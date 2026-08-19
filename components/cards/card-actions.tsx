import Link from "next/link";
import type { ReactNode } from "react";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { LockAltIcon } from "@/components/ui/icons/lock-alt";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { SnowIcon } from "@/components/ui/icons/snow";

const TILE =
  "flex size-12.5 items-center justify-center rounded-panel bg-jumpa-primary-50 text-jumpa-primary-600";

function Action({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-2">
      {children}
      <span className="text-[10px] leading-3.5 font-medium whitespace-nowrap text-jumpa-black">
        {label}
      </span>
    </span>
  );
}

/** Row under the card: details, freeze toggle, PIN and history. */
export function CardActions({
  frozen,
  onDetails,
  onFreeze,
  onPin,
}: {
  frozen: boolean;
  onDetails: () => void;
  onFreeze: () => void;
  onPin: () => void;
}) {
  return (
    <div className="flex items-start justify-center gap-6">
      <button type="button" onClick={onDetails}>
        <Action label="Details">
          <span className={TILE}>
            <CircleInformationIcon className="size-6" />
          </span>
        </Action>
      </button>

      <button type="button" onClick={onFreeze}>
        <Action label={frozen ? "Unfreeze" : "Freeze"}>
          <span className={TILE}>
            <SnowIcon className="size-6" />
          </span>
        </Action>
      </button>

      <button type="button" onClick={onPin}>
        <Action label="Show PIN">
          <span className={TILE}>
            <LockAltIcon className="size-6" />
          </span>
        </Action>
      </button>

      <Link href="/transactions">
        <Action label="History">
          <span className={TILE}>
            <ReceiptAltIcon className="size-6" />
          </span>
        </Action>
      </Link>
    </div>
  );
}

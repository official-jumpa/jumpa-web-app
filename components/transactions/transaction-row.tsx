import Image from "next/image";
import { ArrowUpIcon } from "@/components/ui/icons/arrow-up";
import { CreditCardPlusIcon } from "@/components/ui/icons/credit-card-plus";
import { getAssetLogo } from "@/lib/assets";
import { cn } from "@/lib/cn";
import type { Transaction } from "@/lib/wallet";

const STATUS_LABEL = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
} as const;

/** Hairline between rows. `-mb-px` keeps it out of the flow — Figma draws it as a zero-height line. */
export function TransactionRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

/** One history entry: direction tile, what and when, amount and status. */
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { kind, chain, title, detail, amount, status } = transaction;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-white">
          {kind === "card" ? (
            <CreditCardPlusIcon className="size-6 text-jumpa-primary-600" />
          ) : (
            <ArrowUpIcon
              className={cn(
                "size-6 text-jumpa-black",
                kind === "receive" && "-scale-y-100",
              )}
            />
          )}
          {chain ? (
            <Image
              src={getAssetLogo(chain)}
              alt=""
              width={36}
              height={36}
              className="absolute right-0.5 bottom-0 size-4.5 rounded-full"
            />
          ) : null}
        </span>

        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
            {title}
          </span>
          <span className="truncate text-xs leading-3.5 font-medium text-jumpa-neutral-700">
            {detail}
          </span>
        </span>
      </div>

      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-sm leading-4 font-semibold text-jumpa-black">
          {amount}
        </span>
        <span
          className={cn(
            "text-xs leading-3.5 font-medium",
            status === "failed"
              ? "text-jumpa-danger"
              : "text-jumpa-neutral-775",
          )}
        >
          {STATUS_LABEL[status] || status}
        </span>
      </span>
    </div>
  );
}

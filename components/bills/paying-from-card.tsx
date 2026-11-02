import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { WalletCardIcon } from "@/components/ui/icons/wallet-card";

/** The wallet a bill is paid from; only the naira wallet pays bills today. */
export function PayingFromCard({ balance }: { balance: string }) {
  return (
    <div className="flex h-15.25 items-center gap-3.25 rounded-card bg-jumpa-neutral-50 pr-4 pl-4.5">
      <span className="flex size-8.75 shrink-0 items-center justify-center rounded-full bg-jumpa-lilac-150 text-jumpa-primary-600">
        <WalletCardIcon className="size-5.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span className="text-[10px] leading-none font-medium text-jumpa-ink-muted">
          Paying from
        </span>
        <span className="truncate text-xs leading-none font-medium tracking-jumpa-snug text-jumpa-ink">
          Naira wallet · {balance}
        </span>
      </span>
      {/* TODO: turn the card into a wallet picker once another wallet can pay bills. */}
      <ChevronRightIcon className="size-5 shrink-0 text-jumpa-neutral-270" />
    </div>
  );
}

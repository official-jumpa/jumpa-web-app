import Image from "next/image";
import Link from "next/link";
import { ArrowUpIcon } from "@/components/ui/icons/arrow-up";
import { CreditCardPlusIcon } from "@/components/ui/icons/credit-card-plus";
import { FlipForwardIcon } from "@/components/ui/icons/flip-forward";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { PhoneAltOutlineIcon } from "@/components/ui/icons/phone-alt-outline";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { WifiIcon } from "@/components/ui/icons/wifi";
import { getAssetLogo } from "@/lib/assets";
import { getCarrierLogo } from "@/lib/bills";
import { cn } from "@/lib/cn";
import { formatTxDate, type Transaction, type TransactionKind } from "@/lib/wallet";

const STATUS_LABEL = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
} as const;

/** One glyph per kind; `spin` carries the rotation the design draws it at. */
const GLYPH: Record<
  TransactionKind,
  { Icon: typeof ArrowUpIcon; spin?: string }
> = {
  send: { Icon: ArrowUpIcon },
  receive: { Icon: ArrowUpIcon, spin: "-scale-y-100" },
  card: { Icon: CreditCardPlusIcon },
  swap: { Icon: SwitchHorizontalIcon },
  bridge: { Icon: FlipForwardIcon, spin: "rotate-90 -scale-y-100" },
  airtime: { Icon: PhoneAltOutlineIcon },
  data: { Icon: WifiIcon },
  invest: { Icon: MoneyWithdrawalIcon },
};

/** Hairline between rows. `-mb-px` keeps it out of the flow — Figma draws it as a zero-height line. */
export function TransactionRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

/** One history entry: kind tile, what and when, amount and status. */
export function TransactionRow({
  transaction,
  badge = true,
}: {
  transaction: Transaction;
  /** The chain mark on the tile. Off on a fiat-only screen, where no token is involved. */
  badge?: boolean;
}) {
  const { id, kind, chain, title, detail, amount, status, carrier, createdAt } =
    transaction;
  const { Icon, spin } = GLYPH[kind] ?? GLYPH.send;

  const displayDate = createdAt ? formatTxDate(createdAt) : detail || "";

  // Resolve carrier network logo for airtime / data
  const isBill = kind === "airtime" || kind === "data";
  const networkLogo = isBill
    ? getCarrierLogo(carrier || title || displayDate)
    : null;

  const body = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-white">
          {networkLogo ? (
            <Image
              src={networkLogo}
              alt={carrier || "Network"}
              width={28}
              height={28}
              className="size-7 rounded-full object-contain"
            />
          ) : (
            <Icon
              className={cn("size-6 text-jumpa-primary-600", spin)}
            />
          )}
          {badge && chain && chain !== "fiat" ? (
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
          <span
            suppressHydrationWarning
            className="truncate text-xs leading-3.5 font-medium text-jumpa-neutral-700"
          >
            {displayDate}
          </span>
        </span>
      </div>

      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-sm leading-4 font-semibold text-jumpa-black">
          {amount}
        </span>
        <span
          className={cn(
            "text-xs leading-3.5 font-medium lowercase",
            status === "failed"
              ? "text-jumpa-warning"
              : "text-jumpa-neutral-775",
          )}
        >
          {STATUS_LABEL[status] || status}
        </span>
      </span>
    </>
  );

  if (!id) return <div className="flex items-center gap-1.5">{body}</div>;

  return (
    <Link
      prefetch
      href={`/transactions?id=${encodeURIComponent(id)}`}
      className="tap flex items-center gap-1.5 text-left active:scale-[0.98]"
    >
      {body}
    </Link>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowUpIcon } from "@/components/ui/icons/arrow-up";
import { CreditCardPlusIcon } from "@/components/ui/icons/credit-card-plus";
import { FlipForwardIcon } from "@/components/ui/icons/flip-forward";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { PhoneAltOutlineIcon } from "@/components/ui/icons/phone-alt-outline";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { WifiIcon } from "@/components/ui/icons/wifi";
import { MinusBoldIcon } from "@/components/ui/icons/minus-bold";
import { TransferLineIcon } from "@/components/ui/icons/transfer-line";
import { LocalTime } from "@/components/ui/local-time";
import { getAssetLogo } from "@/lib/assets";
import { getCarrierLogo } from "@/lib/bills";
import { cn } from "@/lib/cn";
import { formatHistoryAmount, formatHistoryClock, formatHistoryDay } from "@/lib/history";
import { formatTxDate, type Transaction, type TransactionKind } from "@/lib/wallet";
import { useSearchParams } from "next/navigation";

const STATUS_LABEL = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
} as const;

/** Card-row amount colour by outcome. */
const AMOUNT_TONE = {
  completed: "text-jumpa-success-500",
  pending: "text-jumpa-warning",
  failed: "text-jumpa-danger",
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

const LAYOUT = {
  card: "flex items-center gap-1.5",
  history: "flex h-10.5 items-center gap-3",
} as const;

const TAP = "tap text-left active:scale-[0.98]";

/** History-screen disc and amount colours: money in, money out, or failed. */
const TONE = {
  in: { disc: "bg-jumpa-success-50 text-jumpa-success-500", amount: "text-jumpa-success-500" },
  out: { disc: "bg-jumpa-primary-50 text-jumpa-primary-600", amount: "text-jumpa-ink" },
  failed: { disc: "bg-jumpa-rose-50 text-jumpa-rose-500", amount: "text-jumpa-rose-500" },
} as const;

/** The history screen's row: tinted disc, title over "date, subtitle · time", signed amount. */
function HistoryBody({ transaction }: { transaction: Transaction }) {
  const { kind, title, subtitle, amount, status, createdAt } = transaction;
  const tone = status === "failed" ? "failed" : amount.startsWith("+") ? "in" : "out";
  const date = createdAt ? new Date(createdAt) : null;

  let glyph = <ArrowUpIcon className={cn("size-3.5", tone === "in" && "-scale-y-100")} />;
  if (tone === "failed") glyph = <MinusBoldIcon className="size-3" />;
  else if (kind === "swap" || kind === "bridge") glyph = <TransferLineIcon className="size-3.5" />;

  return (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          TONE[tone].disc,
        )}
      >
        {glyph}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.25 leading-none">
        <span className="truncate text-xs font-medium tracking-jumpa-snug text-jumpa-ink">
          {title}
        </span>
        <span className="truncate text-[10px] tracking-jumpa-snug text-jumpa-ink-muted">
          {date ? (
            <LocalTime at={date} fallback={formatHistoryDay(date)} format="historyDay" />
          ) : null}
          {subtitle ? `, ${subtitle}` : ""}
          {date ? " · " : ""}
          {date ? (
            <LocalTime at={date} fallback={formatHistoryClock(date)} format="historyClock" />
          ) : null}
          {status === "pending" ? " · Pending" : ""}
        </span>
      </span>

      <span
        className={cn(
          "shrink-0 text-xs leading-none font-medium tracking-jumpa-snug",
          TONE[tone].amount,
        )}
      >
        {formatHistoryAmount(amount)}
      </span>
    </>
  );
}

/** Hairline between rows. `-mb-px` keeps it out of the flow — Figma draws it as a zero-height line. */
export function TransactionRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

/** One history entry: kind tile, what and when, amount and status. */
export function TransactionRow({
  transaction,
  badge = true,
  onSelect,
  variant = "card",
}: {
  transaction: Transaction;
  /** The chain mark on the tile. Off on a fiat-only screen, where no token is involved. */
  badge?: boolean;
  /** Turns the row into a picker choice instead of a link to its detail. */
  onSelect?: (transaction: Transaction) => void;
  /** `history` is the transaction-history screen's layout; `card` is every other list. */
  variant?: keyof typeof LAYOUT;
}) {
  const { id, displayId, kind, chain, title, detail, amount, status, carrier, createdAt } =
    transaction;
  const { Icon, spin } = GLYPH[kind] ?? GLYPH.send;

  const displayDate = createdAt ? formatTxDate(createdAt) : detail || "";

  // Resolve carrier network logo for airtime / data
  const isBill = kind === "airtime" || kind === "data";
  const networkLogo = isBill
    ? getCarrierLogo(carrier || title || displayDate)
    : null;

  const body = variant === "history" ? (
    <HistoryBody transaction={transaction} />
  ) : (
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
              className={cn("size-6 text-jumpa-black", spin)}
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
          <span className="truncate text-xs leading-3.5 font-medium text-jumpa-neutral-700">
            {createdAt ? (
              <LocalTime
                at={createdAt}
                fallback={displayDate}
                format="history"
              />
            ) : (
              displayDate
            )}
          </span>
        </span>
      </div>

      <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span
          className={cn(
            "text-sm leading-4 font-semibold",
            AMOUNT_TONE[status] ?? "text-jumpa-black",
          )}
        >
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
    </>
  );

  if (!id) return <div className={LAYOUT[variant]}>{body}</div>;

  const targetId = (id || displayId || "").replace(/^tx_/i, "").toLowerCase();

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(transaction)}
        className={cn(TAP, LAYOUT[variant], "w-full")}
      >
        {body}
      </button>
    );
  }

  const searchParams = useSearchParams();
  const searchString =
    typeof window !== "undefined" && window.location.search
      ? window.location.search
      : searchParams?.toString() || "";
  const rawParams = new URLSearchParams(
    searchString.startsWith("?") ? searchString.slice(1) : searchString,
  );
  const currentParams = new URLSearchParams();
  rawParams.forEach((val, key) => {
    currentParams.set(key.toLowerCase(), val.toLowerCase());
  });
  currentParams.set("id", targetId.toLowerCase());

  return (
    <Link
      prefetch={false}
      href={`/transactions?${currentParams.toString()}`}
      className={cn(TAP, LAYOUT[variant])}
    >
      {body}
    </Link>
  );
}

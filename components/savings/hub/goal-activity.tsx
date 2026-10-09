import { Fragment } from "react";
import { TransactionRule } from "@/components/transactions/transaction-row";
import { ArrowUpIcon } from "@/components/ui/icons/arrow-up";
import { ArrowUpFromArcIcon } from "@/components/ui/icons/arrow-up-from-arc";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import {
  ACTIVITY_LABEL,
  formatMoney,
  type HubActivity,
  type HubActivityKind,
  type HubCurrency,
} from "@/lib/savings-hub";

/** Same glyph language as the transaction history: money in points down. */
const GLYPH: Record<
  HubActivityKind,
  { Icon: typeof ArrowUpIcon; flip?: true }
> = {
  deposit: { Icon: ArrowUpIcon, flip: true },
  withdrawal: { Icon: ArrowUpFromArcIcon },
  interest: { Icon: BadgePercentIcon },
};

/** A plan's deposits, withdrawals and interest, newest first. */
export function GoalActivity({
  activity,
  currency,
}: {
  activity: HubActivity[];
  currency: HubCurrency;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-jumpa-black">Activity</h2>

      <div className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-5 py-5">
        {activity.length === 0 ? (
          <p className="py-2 text-center text-xs text-jumpa-neutral-500">
            Deposits and interest will show up here.
          </p>
        ) : (
          activity.map((entry, index) => (
            <Fragment key={entry.id}>
              {index > 0 ? <TransactionRule /> : null}
              <ActivityRow entry={entry} currency={currency} />
            </Fragment>
          ))
        )}
      </div>
    </section>
  );
}

function ActivityRow({
  entry,
  currency,
}: {
  entry: HubActivity;
  currency: HubCurrency;
}) {
  const { Icon, flip } = GLYPH[entry.kind];
  const sign = entry.kind === "withdrawal" ? "−" : "+";

  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-white">
        <Icon
          className={`size-6 text-jumpa-primary-600 ${flip ? "-scale-y-100" : ""}`}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-4 font-medium text-jumpa-black">
          {ACTIVITY_LABEL[entry.kind]}
        </span>
        <span className="text-xs leading-4 text-jumpa-neutral-500">
          {entry.date}
        </span>
      </span>
      <span
        className={`shrink-0 text-sm leading-4 font-semibold ${
          entry.kind === "interest"
            ? "text-jumpa-primary-600"
            : "text-jumpa-black"
        }`}
      >
        {sign}
        {formatMoney(entry.amount, currency)}
      </span>
    </div>
  );
}

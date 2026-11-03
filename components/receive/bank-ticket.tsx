import Image from "next/image";
import { Fragment } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import type { OnrampOrder } from "@/lib/naira-deposit";

const LABEL = "text-xs leading-4 tracking-jumpa-snug text-jumpa-black/50";
const VALUE =
  "truncate text-xs leading-5 font-medium tracking-jumpa-snug text-jumpa-black";

/** The lavender ticket band holding the account the naira goes to. Full-bleed, so it undoes the page gutter. */
export function BankTicket({ order }: { order: OnrampOrder }) {
  const rows = [
    {
      label: "Bank name",
      value: <span className={VALUE}>{order.bankName}</span>,
    },
    {
      label: "Account name",
      value: <span className={VALUE}>{order.accountName}</span>,
    },
    {
      label: "Account number",
      value: (
        <span className="flex items-center gap-1.5">
          <span className="text-xs leading-5 font-semibold text-jumpa-primary-600">
            {order.accountNumber}
          </span>
          <CopyButton
            value={order.accountNumber}
            name="Copy account number"
            className="[&>svg]:size-3.75"
          />
        </span>
      ),
    },
  ];

  return (
    <div className="relative -mx-4.5 flex h-50.25 items-center px-4.5">
      <Image
        src="/images/deposit/ticket.svg"
        alt=""
        width={393}
        height={201}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full max-w-none"
      />
      <dl className="relative flex h-32.5 w-full flex-col justify-center gap-1.5 rounded-key border border-jumpa-surface-faq bg-jumpa-white px-5">
        {rows.map(({ label, value }, index) => (
          <Fragment key={label}>
            {index > 0 ? (
              <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />
            ) : null}
            <div className="flex h-5 items-center justify-between gap-3">
              <dt className={LABEL}>{label}</dt>
              <dd className="flex min-w-0 justify-end">{value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

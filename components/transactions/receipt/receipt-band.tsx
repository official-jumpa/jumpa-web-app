"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { copyText } from "@/lib/clipboard";
import type { TransactionDetailRow } from "@/lib/wallet";

const VALUE = "min-w-0 truncate text-right text-xs leading-5 font-semibold";

function CopyValue({ value, name }: { value: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!(await copyText(value))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? `${name} copied` : `Copy ${name}`}
      className="flex size-3.75 shrink-0 items-center justify-center tap"
    >
      {copied ? (
        <CheckIcon className="size-3.75 text-jumpa-success" />
      ) : (
        <Image src="/images/receipt/clone.svg" alt="" width={15} height={15} />
      )}
    </button>
  );
}

function DetailRow({ row }: { row: TransactionDetailRow }) {
  return (
    <div className="flex h-5 items-center justify-between gap-3 pr-0.5">
      <span className="shrink-0 pl-2 text-xs leading-5 tracking-jumpa-snug text-jumpa-slate-600">
        {row.label}
      </span>
      <span className="flex min-w-0 items-center gap-1">
        {row.link ? (
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${VALUE} text-jumpa-primary-600`}
          >
            {row.value}
          </a>
        ) : (
          <span className={`${VALUE} text-jumpa-black`}>{row.value}</span>
        )}
        {row.copy ? <CopyValue value={row.copy} name={row.label} /> : null}
      </span>
    </div>
  );
}

/** The ticket band: what kind of movement, when, then every detail row. */
export function ReceiptBand({
  label,
  mark,
  date,
  rows,
  className = "",
}: {
  label: string;
  mark: string | null;
  date: string;
  rows: TransactionDetailRow[];
  /** Outer margin only. */
  className?: string;
}) {
  return (
    <section
      className={`-mx-4.5 border-x-0 border-t-10 border-b-9 border-solid px-4.5 pb-5.75 [border-image:url(/images/receipt/band.svg)_10_0_9_fill] ${className}`}
    >
      <div className="mt-3.25 flex h-8.25 items-center justify-between gap-3 rounded-row border border-jumpa-surface-faq bg-jumpa-white pr-4.25 pl-4.5">
        <span className="flex min-w-0 items-center gap-1.75">
          {mark ? (
            <Image
              src={mark}
              alt=""
              width={42}
              height={42}
              className="size-5.25 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <span className="truncate text-[10px] leading-5.5 tracking-jumpa-snug text-jumpa-black">
            {label}
          </span>
        </span>
        <span className="shrink-0 text-[10px] leading-4.5 tracking-jumpa-snug text-jumpa-black">
          {date}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="mt-1.75 flex flex-col gap-1.5 rounded-3xl border border-jumpa-surface-faq bg-jumpa-white px-3 pt-4.25 pb-4">
          {rows.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? (
                <div className="-mb-px ml-1.75 h-px overflow-hidden">
                  <Image
                    src="/images/receipt/divider.svg"
                    alt=""
                    width={322}
                    height={1}
                    className="max-w-none"
                  />
                </div>
              ) : null}
              <DetailRow row={row} />
            </Fragment>
          ))}
        </div>
      ) : null}
    </section>
  );
}

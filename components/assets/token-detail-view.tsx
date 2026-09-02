"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getAssetLogo } from "@/lib/assets";
import type { Asset, Transaction } from "@/lib/wallet";

/** Stands in for the digits while the balance is hidden. */
const MASK = "*".repeat(9);

/** One wallet: its balance, what you can do with it, and its history. */
export function TokenDetailView({
  asset,
  transactions,
}: {
  asset: Asset;
  transactions: Transaction[];
}) {
  const [visible, setVisible] = useState(true);
  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;

  const actions = [
    {
      label: "Add",
      href: `/assets/${asset.symbol.toLowerCase()}/receive`,
      Icon: ArrowUpRightIcon,
    },
    {
      label: "Receive",
      href: `/assets/${asset.symbol.toLowerCase()}/receive`,
      Icon: ArrowDownRightIcon,
    },
    { label: "Swap", href: "/swap", Icon: SwitchHorizontalIcon },
  ];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/assets" title={asset.symbol} round />

      <section className="relative isolate mt-4 flex h-30 flex-col items-center justify-center gap-3 overflow-hidden rounded-key bg-[image:var(--gradient-jumpa-hero)]">
        <Image
          src="/images/home/hero-grid.svg"
          alt=""
          aria-hidden="true"
          width={287}
          height={264}
          className="pointer-events-none absolute -top-8 left-1/2 -z-10 max-w-none -translate-x-1/2"
        />

        <span className="flex items-center gap-1.5 rounded-pill bg-jumpa-white py-1.5 pr-3 pl-1.5 text-[10px] leading-3 font-bold text-jumpa-primary-950">
          <Image
            src={getAssetLogo(asset.symbol)}
            alt=""
            width={16}
            height={16}
            className="size-4 rounded-full object-contain"
          />
          {asset.symbol} BALANCE
        </span>

        <p className="flex items-center gap-2 text-2xl leading-7 font-semibold text-jumpa-white">
          {visible ? asset.balance : MASK}
          <button
            type="button"
            onClick={() => setVisible((on) => !on)}
            aria-label={visible ? "Hide balance" : "Show balance"}
          >
            <ToggleIcon className="size-6" />
          </button>
        </p>
      </section>

      <nav className="mt-6 flex items-start justify-center gap-8">
        {actions.map(({ label, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="tap flex w-14 flex-col items-center gap-2 active:scale-95"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
              <Icon className="size-6" />
            </span>
            <span className="text-xs leading-4 font-medium text-jumpa-black">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-8 flex items-center justify-between text-sm leading-4.5 font-medium text-jumpa-black">
        <h2>Transaction History</h2>
        <Link href="/transactions" className="text-jumpa-primary-950">
          See All
        </Link>
      </div>

      <div className="mt-3 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-5 py-4">
        {transactions.length === 0 ? (
          <TransactionEmpty />
        ) : (
          <ul className="flex flex-col gap-4">
            {transactions.map((transaction, index) => (
              <li key={transaction.id} className="flex flex-col gap-4">
                {index > 0 ? <TransactionRule /> : null}
                <TransactionRow transaction={transaction} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { depositHref, walletHref } from "@/hooks/use-asset-network";
import { getAssetLogo } from "@/lib/assets";
import type { Chain } from "@/lib/networks";
import type { Asset, Transaction } from "@/lib/wallet";

/** Stands in for the digits while the balance is hidden. */
const MASK = "*".repeat(9);

const ACTION = "tap flex w-14 flex-col items-center gap-2 active:scale-95";

const PILL =
  "flex h-8 items-center gap-1 rounded-pill bg-jumpa-neutral-50 px-3 text-xs leading-4 font-medium text-jumpa-primary-950";

/** One wallet: its balance, what you can do with it, and its history. */
export function TokenDetailView({
  asset,
  chains,
  chain,
  transactions,
}: {
  asset: Asset;
  chains: Chain[];
  /** The chain in view, once one has been picked. */
  chain?: Chain;
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [asking, setAsking] = useState<"wallet" | "deposit">();
  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;
  const switchable = chains.length > 1;

  // Add and Receive both end at the deposit address. The chain is already
  // known unless the screen was opened directly, so it rarely has to ask.
  const deposit = () =>
    chain
      ? router.push(depositHref(asset.symbol, chain))
      : setAsking("deposit");

  const choose = (next: Chain) => {
    const to = asking === "deposit" ? depositHref : walletHref;
    router.push(to(asset.symbol, next));
    setAsking(undefined);
  };

  const actions = [
    { label: "Add", onClick: deposit, Icon: ArrowUpRightIcon },
    { label: "Receive", onClick: deposit, Icon: ArrowDownRightIcon },
    { label: "Swap", href: "/swap", Icon: SwitchHorizontalIcon },
  ];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/assets"
        title={asset.symbol}
        round
        action={
          chain ? (
            switchable ? (
              <button
                type="button"
                onClick={() => setAsking("wallet")}
                className={`tap ${PILL} active:scale-95`}
              >
                {chain.name}
                <ChevronDownIcon className="size-4" />
              </button>
            ) : (
              <span className={PILL}>{chain.name}</span>
            )
          ) : null
        }
      />

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
        {actions.map(({ label, href, onClick, Icon }) => {
          const body = (
            <>
              <span className="flex size-14 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                <Icon className="size-6" />
              </span>
              <span className="text-xs leading-4 font-medium text-jumpa-black">
                {label}
              </span>
            </>
          );

          return href ? (
            <Link key={label} href={href} className={ACTION}>
              {body}
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={ACTION}
            >
              {body}
            </button>
          );
        })}
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
              <li
                key={transaction.id || (transaction as any)._id || index}
                className="flex flex-col gap-4"
              >
                {index > 0 ? <TransactionRule /> : null}
                <TransactionRow transaction={transaction} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {asking ? (
        <NetworkSheet
          symbol={asset.symbol}
          chains={chains}
          selected={asking === "wallet" ? chain?.id : undefined}
          description={
            asking === "wallet"
              ? `${asset.symbol} lives on more than one chain. Pick the one you want to see.`
              : undefined
          }
          onSelect={choose}
          onClose={() => setAsking(undefined)}
        />
      ) : null}
    </div>
  );
}

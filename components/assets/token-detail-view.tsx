"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { depositHref, walletHref } from "@/hooks/use-asset-network";
import { getAssetLogo } from "@/lib/assets";
import type { Chain } from "@/lib/blockchain";
import type { Asset, Transaction } from "@/lib/wallet";

/** Stands in for the digits while the balance is hidden. */
const MASK = "*".repeat(9);

const ACTION = "tap flex w-14 flex-col items-center gap-2 active:scale-95";

const PILL =
  "flex h-8 items-center gap-1 rounded-pill bg-jumpa-neutral-50 px-3 text-xs leading-4 font-medium text-jumpa-primary-950";

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
  const [liveBalance, setLiveBalance] = useState<string>(() => asset.balance);

  useEffect(() => {
    setLiveBalance(asset.balance);
  }, [asset.balance]);

  // Sync balance from localStorage or live /api/wallet/balance on client mount
  useEffect(() => {
    let isMounted = true;

    try {
      const savedVisible = localStorage.getItem("jumpa_balance_visible");
      if (savedVisible !== null) {
        setVisible(savedVisible === "true");
      }

      const cachedAssetsStr = localStorage.getItem("jumpa_last_assets");
      if (cachedAssetsStr) {
        const cachedAssets = JSON.parse(cachedAssetsStr);
        if (Array.isArray(cachedAssets)) {
          const matchedAsset = cachedAssets.find(
            (a: any) => a.symbol?.toUpperCase() === asset.symbol.toUpperCase(),
          );
          if (
            matchedAsset?.change &&
            (!liveBalance || liveBalance.startsWith("0.00") || liveBalance === "0.00")
          ) {
            setLiveBalance(matchedAsset.change);
          }
        }
      }
    } catch {}

    async function fetchLiveBalance() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !Array.isArray(data.tokens)) return;

        const symbolUpper = asset.symbol.toUpperCase();
        const chainIdLower = (chain?.id || "").toLowerCase();
        const chainNameLower = (chain?.name || "").toLowerCase();

        const matching = data.tokens.filter((t: any) => {
          if (t.symbol?.toUpperCase() !== symbolUpper) return false;
          const net = (t.network || "").toLowerCase();
          if (!chainIdLower) return true;
          return (
            net === chainIdLower ||
            net === chainNameLower ||
            net.includes(chainIdLower) ||
            net.includes(chainNameLower) ||
            (chainIdLower === "stellar" &&
              (net.includes("stellar") || net.includes("xlm"))) ||
            (chainIdLower === "solana" &&
              (net.includes("solana") || net.includes("sol"))) ||
            (chainIdLower === "ethereum" &&
              (net.includes("ethereum") ||
                net.includes("eth") ||
                net.includes("sepolia"))) ||
            (chainIdLower === "base" && net.includes("base"))
          );
        });

        const chosen =
          matching.find(
            (t: any) => !t.isTestnet && (parseFloat(t.balance) || 0) > 0,
          ) ||
          matching.find((t: any) => (parseFloat(t.balance) || 0) > 0) ||
          matching.find((t: any) => !t.isTestnet) ||
          matching[0] ||
          data.tokens.find((t: any) => t.symbol?.toUpperCase() === symbolUpper);

        if (chosen) {
          const balNum = parseFloat(chosen.balance || "0");
          const formatted = balNum.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
          setLiveBalance(`${formatted} ${asset.symbol}`);
        }
      } catch (err) {
        console.warn("[TokenDetailView] Failed to fetch live balance:", err);
      }
    }

    fetchLiveBalance();

    return () => {
      isMounted = false;
    };
  }, [asset.symbol, chain?.id, chain?.name]);

  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;
  const switchable = chains.length > 1;

  // Receive ends at the deposit address. The chain is already known unless the
  // screen was opened directly.
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
    { label: "Receive", onClick: deposit, Icon: ArrowDownRightIcon },
    { label: "Swap", href: "/swap", Icon: SwitchHorizontalIcon },
  ];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
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
          {visible ? liveBalance : MASK}
          <button
            type="button"
            onClick={() => {
              setVisible((on) => {
                const next = !on;
                try {
                  localStorage.setItem("jumpa_balance_visible", String(next));
                } catch {}
                return next;
              });
            }}
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
        <Link
          href={
            chain
              ? `/transactions?chain=${encodeURIComponent(chain.id)}`
              : "/transactions"
          }
          className="text-jumpa-primary-950"
        >
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

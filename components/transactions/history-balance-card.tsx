"use client";

import Image from "next/image";
import { type ComponentType, useEffect, useState } from "react";
import { getAssetLogo, unifyTokens } from "@/lib/assets";
import { cn } from "@/lib/cn";
import type { HistoryScope } from "@/lib/history";

const TITLE: Record<HistoryScope, string> = {
  ngn: "Naira Balance",
  usd: "USD Balance",
  crypto: "Crypto Balance",
};

const GROUND: Record<HistoryScope, string> = {
  ngn: "from-jumpa-surface to-jumpa-violet-50",
  usd: "from-jumpa-mint-25 to-jumpa-mint-50",
  crypto: "from-jumpa-lilac-25 to-jumpa-lilac-50",
};

/** Positioned from the card's right edge so the art stays put as the column widens. */
function Art({ src, className }: { src: string; className: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={126}
      height={126}
      unoptimized
      className={cn("pointer-events-none absolute max-w-none", className)}
    />
  );
}

function Coin({ symbol, className }: { symbol: string; className: string }) {
  return (
    <Image
      src={getAssetLogo(symbol)}
      alt=""
      width={108}
      height={108}
      className={cn("pointer-events-none absolute rounded-full", className)}
    />
  );
}

function NairaArt() {
  return (
    <>
      <Art
        src="/images/transactions/ngn-ring-back.svg"
        className="top-15.5 right-1.75 size-31.5"
      />
      <Art
        src="/images/transactions/ngn-ring-front.svg"
        className="top-8.5 -right-14.5 size-31.5"
      />
      <Art
        src="/images/transactions/ngn-disc.svg"
        className="top-5 right-10.5 size-18.25"
      />
      <span
        aria-hidden="true"
        className="absolute top-10 right-16.25 flex w-6 flex-col items-center text-[32px] leading-none font-bold text-jumpa-primary-600"
      >
        N
        <span className="absolute top-3.25 h-0.75 w-6 bg-jumpa-primary-600" />
        <span className="absolute top-4.75 h-0.75 w-6 bg-jumpa-primary-600" />
      </span>
    </>
  );
}

function DollarArt() {
  return (
    <>
      <Art
        src="/images/transactions/usd-ring-back.svg"
        className="top-15.5 right-1.75 size-31.5"
      />
      <Art
        src="/images/transactions/usd-ring-mid.svg"
        className="top-16.75 -right-9.5 size-31.5"
      />
      <Art
        src="/images/transactions/usd-ring-front.svg"
        className="top-15.5 -right-17 size-31.5"
      />
      <Art
        src="/images/transactions/usd-dot.svg"
        className="top-4.5 right-3.5 size-3.5"
      />
      <Art
        src="/images/transactions/usd-disc.svg"
        className="top-5 right-10.5 size-18.25"
      />
      <span
        aria-hidden="true"
        className="absolute top-9.75 right-17 text-[32px] leading-none font-extrabold text-jumpa-success-500"
      >
        $
      </span>
    </>
  );
}

function CryptoArt() {
  return (
    <>
      <Art
        src="/images/transactions/crypto-platform.svg"
        className="top-0.5 -right-3 h-36.25 w-45.25"
      />
      <Art
        src="/images/transactions/crypto-dot.svg"
        className="top-25.5 -right-0.5 size-3.5"
      />
      <Coin symbol="ETH" className="top-8.5 right-27.5 size-6.75" />
      <Art
        src="/images/transactions/crypto-shadow-sm.svg"
        className="top-14.25 right-27 h-3 w-7.75"
      />
      <Art
        src="/images/transactions/crypto-shadow-lg.svg"
        className="top-21.5 right-16.25 h-4 w-12.75"
      />
      <Art
        src="/images/transactions/crypto-shadow-md.svg"
        className="top-21.5 right-10 h-3 w-8"
      />
      <Art
        src="/images/transactions/crypto-shadow-md.svg"
        className="top-13.75 right-7.75 h-3 w-8"
      />
      <Art
        src="/images/transactions/crypto-shadow-md.svg"
        className="top-9.75 right-14 h-3 w-8"
      />
      <Coin symbol="XLM" className="top-16.25 right-10.5 size-6.5" />
      <Coin symbol="SOL" className="top-4.25 right-15.5 size-7" />
      <span className="pointer-events-none absolute top-9.75 right-15.5 size-13.5 overflow-hidden rounded-full">
        <Image
          src={getAssetLogo("BTC")}
          alt=""
          width={108}
          height={108}
          className="size-full"
        />
        <span className="absolute inset-0 rounded-full shadow-[inset_0_4px_4px_0_var(--color-jumpa-coin-glow)]" />
      </span>
      <Coin symbol="USDT" className="top-8.5 right-8.25 size-6.5" />
    </>
  );
}

const ART: Record<HistoryScope, ComponentType> = {
  ngn: NairaArt,
  usd: DollarArt,
  crypto: CryptoArt,
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUsd(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadBalance(
  scope: HistoryScope,
  asset?: string,
): Promise<string> {
  if (scope === "usd") {
    // TODO: read the USD account balance once it goes live (NOT_LIVE in fiat-accounts.tsx).
    return formatUsd(0);
  }

  if (scope === "ngn") {
    const res = await fetch("/api/v1/ngn-account", { cache: "no-store" });
    if (!res.ok) return formatNaira(0);
    const data = await res.json();
    return formatNaira(Number(data.balance?.availableBalance ?? 0));
  }

  const res = await fetch("/api/v1/wallet?fields=balance", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  if (!asset) return formatUsd(Number(data?.totalUsd ?? 0));
  const held = unifyTokens(data?.tokens ?? []).find(
    (token) => token.symbol === asset,
  );
  return held?.change ?? `0.00 ${asset}`;
}

/**
 * Balance of the ledger the tab is showing: the naira account, the USD account,
 * or the crypto wallet — in the selected asset, else its dollar total.
 */
export function HistoryBalanceCard({
  scope,
  asset,
}: {
  scope: HistoryScope;
  asset?: string;
}) {
  const [balance, setBalance] = useState<string | null>(null);
  const Decoration = ART[scope];

  useEffect(() => {
    let live = true;
    setBalance(null);
    loadBalance(scope, asset)
      .then((value) => live && setBalance(value))
      .catch((err) =>
        console.warn("[HistoryBalanceCard] Failed to load balance:", err),
      );
    return () => {
      live = false;
    };
  }, [scope, asset]);

  // TODO: the design's "+2.4% from last week" line has no data source yet, so it is left out.
  return (
    <section
      className={cn(
        "relative isolate h-29.25 overflow-hidden rounded-tab bg-linear-to-r px-5.25 pt-5.25",
        GROUND[scope],
      )}
    >
      <Decoration />
      <h2 className="relative text-xs leading-none font-medium tracking-jumpa-snug text-jumpa-ink">
        {TITLE[scope]}
      </h2>
      {balance ? (
        <p className="relative mt-3 text-2xl leading-none font-semibold tracking-jumpa-snug text-jumpa-ink">
          {balance}
        </p>
      ) : (
        <span className="relative mt-3 block h-6 w-32 animate-pulse rounded-chip bg-jumpa-ink/5" />
      )}
    </section>
  );
}

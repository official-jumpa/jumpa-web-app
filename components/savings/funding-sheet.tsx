"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { DollarSignIcon } from "@/components/ui/icons/dollar-sign";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import type { FundingSource } from "@/lib/savings";

const GLYPH = {
  dollar: DollarSignIcon,
  naira: NairaSignIcon,
  crypto: CoinFrontIcon,
};

/** Which wallet the money comes from, raised between the form and the review. */
export function FundingSheet({
  sources: initialSources,
  note,
  rule,
  onContinue,
  onClose,
}: {
  sources: FundingSource[];
  /** The orange caveat under the list. */
  note: string;
  /** The individual flow offers a savings rule from here; the lock flow does not. */
  rule?: { label: string; onClick: () => void };
  onContinue: (source: FundingSource) => void;
  onClose: () => void;
}) {
  const [sources, setSources] = useState<FundingSource[]>(() => {
    let lastBalance = "0.00";
    if (typeof window !== "undefined") {
      try {
        lastBalance = localStorage.getItem("jumpa_last_balance") || "0.00";
      } catch {}
    }
    const num = parseFloat(lastBalance) || 0;
    const formattedUsd = `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return initialSources.map((s) => {
      if (s.id === "usd" || s.id === "crypto") {
        return { ...s, balance: formattedUsd };
      }
      if (s.id === "ngn") {
        return { ...s, balance: "₦0.00" };
      }
      return s;
    });
  });

  const [selected, setSelected] = useState<FundingSource>(() => sources[0] || initialSources[0]);

  useEffect(() => {
    let isMounted = true;

    async function loadLiveBalances() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok || !isMounted) return;
        const data = await res.json();

        // 1. Calculate real USD / Crypto balance across all active tokens
        const totalUsd = parseFloat(data.totalUsd) || 0;
        const usdcTokens =
          data.tokens?.filter((t: any) => t.symbol?.toUpperCase() === "USDC") || [];
        const usdcTotal = usdcTokens.reduce(
          (sum: number, t: any) => sum + (parseFloat(t.balance) || 0),
          0,
        );
        const resolvedUsd = Math.max(totalUsd, usdcTotal);
        const formattedUsd = `$${resolvedUsd.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        try {
          localStorage.setItem("jumpa_last_balance", resolvedUsd.toFixed(2));
        } catch {}

        // 2. Calculate real NGN balance (from cNGN if held, or ₦0.00)
        const cngnToken = data.tokens?.find(
          (t: any) => t.symbol?.toUpperCase() === "CNGN",
        );
        const cngnBal = parseFloat(cngnToken?.balance) || 0;
        const formattedNgn =
          cngnBal > 0
            ? `₦${cngnBal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "₦0.00";

        if (isMounted) {
          setSources((prev) => {
            const next = prev.map((s) => {
              if (s.id === "usd" || s.id === "crypto") {
                return { ...s, balance: formattedUsd };
              }
              if (s.id === "ngn") {
                return { ...s, balance: formattedNgn };
              }
              return s;
            });
            setSelected((curr) => {
              const matched = next.find((s) => s.id === curr?.id);
              return matched || next[0];
            });
            return next;
          });
        }
      } catch (err) {
        console.warn("[FundingSheet] Failed to load live wallet balance:", err);
      }
    }

    loadLiveBalances();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <h2
        id="funding-title"
        className="pt-2 text-lg leading-normal font-semibold text-jumpa-black"
      >
        Select wallet
      </h2>

      <fieldset
        aria-labelledby="funding-title"
        className="mt-4 flex flex-col gap-3"
      >
        {sources.map((source) => {
          const Icon = GLYPH[source.icon];
          const active = source.id === selected.id;

          return (
            <label
              key={source.id}
              className={`tap flex items-center gap-3 rounded-tile px-3 py-4 ${
                active
                  ? "bg-jumpa-primary-50 ring-1 ring-jumpa-primary-600"
                  : "bg-jumpa-neutral-50"
              }`}
            >
              <input
                type="radio"
                name="funding-source"
                value={source.id}
                checked={active}
                onChange={() => setSelected(source)}
                className="sr-only"
              />
              <span className="flex size-9 items-center justify-center rounded-full bg-jumpa-primary-100 text-jumpa-primary-600">
                <Icon className="size-5" />
              </span>
              <span className="flex-1 text-sm leading-4.5 font-medium text-jumpa-black">
                {source.label}
              </span>
              <span className="text-sm leading-4.5 font-semibold text-jumpa-black">
                {source.balance}
              </span>
            </label>
          );
        })}
      </fieldset>

      <p className="mt-4 flex items-start gap-2 text-xs leading-4.5 text-jumpa-warning">
        <SealAlertIcon className="mt-px size-4 shrink-0" />
        {note}
      </p>

      {rule ? (
        <button
          type="button"
          onClick={rule.onClick}
          className="mt-3 self-start text-xs leading-4.5 font-medium text-jumpa-danger underline"
        >
          {rule.label}
        </button>
      ) : null}

      <Button
        variant="gradient"
        size="lg"
        className="mt-6"
        onClick={() => onContinue(selected)}
      >
        I Understand &amp; Continue
      </Button>
    </BottomSheet>
  );
}

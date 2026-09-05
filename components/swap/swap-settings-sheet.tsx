"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";

const SLIPPAGE_PRESETS = [0.1, 0.5, 1, 2];

interface SwapSettingsSheetProps {
  network: "testnet" | "mainnet";
  slippage: number;
  onNetworkChange: (n: "testnet" | "mainnet") => void;
  onSlippageChange: (s: number) => void;
  onClose: () => void;
}

/**
 * Settings sheet opened by the + button in the swap header.
 * Controls two things in one place:
 *   1. Network — Stellar Testnet (active) | Stellar Mainnet (coming soon)
 *   2. Slippage — preset pills + custom text input, default 0.5 %
 */
export function SwapSettingsSheet({
  network,
  slippage,
  onNetworkChange,
  onSlippageChange,
  onClose,
}: SwapSettingsSheetProps) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="mb-5 text-base font-semibold text-jumpa-black">
        Settings
      </h2>
      {/* ── Network ── */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-jumpa-black/40">
          Network
        </p>

        <button
          type="button"
          onClick={() => onNetworkChange("testnet")}
          className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${network === "testnet"
            ? "bg-jumpa-primary-50 ring-1 ring-jumpa-primary-400"
            : "bg-jumpa-neutral-95"
            }`}
        >
          <span className="flex items-center gap-2.5">
            <span
              className={`size-3.5 rounded-full border-2 ${network === "testnet"
                ? "border-jumpa-primary-600 bg-jumpa-primary-600"
                : "border-jumpa-neutral-300 bg-transparent"
                }`}
            />
            <span className="text-sm font-medium text-jumpa-black">
              Stellar Testnet
            </span>
          </span>
          {network === "testnet" && (
            <span className="rounded-full bg-jumpa-primary-100 px-2 py-0.5 text-[10px] font-semibold text-jumpa-primary-700">
              Active
            </span>
          )}
        </button>

        {/* Mainnet — visible but disabled until integrated */}
        <div className="flex items-center justify-between rounded-xl bg-jumpa-neutral-95 px-4 py-3 opacity-50">
          <span className="flex items-center gap-2.5">
            <span className="size-3.5 rounded-full border-2 border-jumpa-neutral-300 bg-transparent" />
            <span className="text-sm font-medium text-jumpa-black">
              Stellar Mainnet
            </span>
          </span>
          <span className="rounded-full bg-jumpa-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-jumpa-black/50">
            Soon
          </span>
        </div>
      </section>

      {/* ── Slippage ── */}
      <section className="mt-5 flex flex-col gap-3">
        <p className="text-xs font-semibold text-jumpa-black/40">
          Slippage
        </p>

        <div className="flex flex-wrap gap-2">
          {SLIPPAGE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onSlippageChange(preset)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${slippage === preset
                ? "bg-jumpa-primary-600 text-white"
                : "bg-jumpa-neutral-95 text-jumpa-black"
                }`}
            >
              {preset}%
            </button>
          ))}
        </div>

        {/* Custom slippage input */}
        <label className="flex items-center gap-2 rounded-xl bg-jumpa-neutral-95 px-4 py-2.5">
          <span className="text-xs text-jumpa-black/50">Custom</span>
          <input
            type="number"
            min="0.01"
            max="50"
            step="0.1"
            placeholder="0.00"
            value={SLIPPAGE_PRESETS.includes(slippage) ? "" : slippage}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0 && v <= 50) onSlippageChange(v);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-jumpa-black outline-none placeholder:text-jumpa-black/30"
          />
          <span className="text-sm font-medium text-jumpa-black/50">%</span>
        </label>

        <p className="text-xs text-jumpa-black/40">
          Higher slippage increases the chance of execution but may result in a higher rate
        </p>
      </section>
    </BottomSheet>
  );
}

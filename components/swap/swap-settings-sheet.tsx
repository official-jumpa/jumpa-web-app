"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";

const SLIPPAGE_PRESETS = [0.1, 0.5, 1, 2];

interface SwapSettingsSheetProps {
  slippage: number;
  onSlippageChange: (s: number) => void;
  onClose: () => void;
}

/**
 * Settings sheet opened by the + button in the swap header.
 * Controls slippage — preset pills + custom text input, default 0.5 %
 */
export function SwapSettingsSheet({
  slippage,
  onSlippageChange,
  onClose,
}: SwapSettingsSheetProps) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="mb-5 text-base font-semibold text-jumpa-black">
        Settings
      </h2>
      {/* ── Slippage ── */}
      <section className="flex flex-col gap-3">
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

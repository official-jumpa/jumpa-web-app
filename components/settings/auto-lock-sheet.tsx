"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import {
  AUTO_LOCK_OPTIONS,
  type AutoLockTimeoutOption,
} from "@/components/auth/auto-lock-provider";

interface AutoLockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeout: AutoLockTimeoutOption;
  onSelect: (option: AutoLockTimeoutOption) => void;
}

export function AutoLockSheet({
  isOpen,
  onClose,
  currentTimeout,
  onSelect,
}: AutoLockSheetProps) {
  if (!isOpen) return null;

  const currentOption = AUTO_LOCK_OPTIONS.find((o) => o.id === currentTimeout);
  const currentLabel = currentOption?.label || "15 minutes";

  return (
    <BottomSheet
      onClose={onClose}
      pb="pb-7"
      className="overflow-y-auto"
    >
      <div className="flex flex-col gap-3 pt-0.5">
        <div>
          <h3 className="text-base font-semibold text-jumpa-black">
            Auto-Lock Wallet
          </h3>
          <p className="mt-1 text-xs text-jumpa-neutral-500 leading-snug">
            Auto-lock protects your account by locking the screen and requiring your 6-digit login password whenever you step away or leave the app.
          </p>
        </div>

        <div className="relative mt-1">
          <select
            value={currentTimeout}
            onChange={(e) => {
              onSelect(e.target.value as AutoLockTimeoutOption);
              onClose();
            }}
            className="w-full appearance-none rounded-xl border border-jumpa-neutral-200 bg-jumpa-neutral-50 px-3.5 py-3 text-sm font-medium text-jumpa-black focus:border-jumpa-primary-600 focus:outline-none focus:ring-1 focus:ring-jumpa-primary-600 cursor-pointer pr-10"
          >
            {AUTO_LOCK_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} {opt.id === "15m" ? "(Recommended)" : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-jumpa-neutral-500">
            <ChevronDownIcon className="size-4" />
          </div>
        </div>

        <p className="text-[11.5px] text-jumpa-neutral-400 leading-tight">
          Your wallet will be locked after {currentLabel} of inactivity.
        </p>
      </div>
    </BottomSheet>
  );
}

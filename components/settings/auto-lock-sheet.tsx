"use client";

import {
  AUTO_LOCK_OPTIONS,
  type AutoLockTimeoutOption,
} from "@/components/auth/auto-lock-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Select, type SelectOption } from "@/components/ui/select";

/** 15 minutes is the safe default, so it carries the caption. */
const OPTIONS: SelectOption[] = AUTO_LOCK_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
  caption: option.id === "15m" ? "Recommended" : undefined,
}));

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
    <BottomSheet onClose={onClose} pb="pb-7" className="overflow-y-auto">
      <div className="flex flex-col gap-3 pt-0.5">
        <div>
          <h3 className="text-base font-semibold text-jumpa-black">
            Auto-Lock Wallet
          </h3>
          <p className="mt-1 text-xs leading-snug text-jumpa-neutral-500">
            Auto-lock protects your account by locking the screen and requiring
            your 6-digit login password whenever you step away or leave the app.
          </p>
        </div>

        {/* The panel sits at the foot of the screen, so the popper flips above it. */}
        <div className="mt-1">
          <Select
            label="Auto-lock timeout"
            value={currentTimeout}
            onValueChange={(next) => {
              onSelect(next as AutoLockTimeoutOption);
              onClose();
            }}
            options={OPTIONS}
          />
        </div>

        <p className="text-[11.5px] leading-tight text-jumpa-neutral-400">
          Your wallet will be locked after {currentLabel} of inactivity.
        </p>
      </div>
    </BottomSheet>
  );
}

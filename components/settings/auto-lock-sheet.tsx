"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AUTO_LOCK_OPTIONS,
  type AutoLockTimeoutOption,
} from "@/components/auth/auto-lock-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

/** 15 minutes is the safe default, so it carries the tag. */
const RECOMMENDED: AutoLockTimeoutOption = "15m";

interface AutoLockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeout: AutoLockTimeoutOption;
  onSelect: (option: AutoLockTimeoutOption) => void;
}

/** Pick how long the wallet waits before locking; Save commits the pick. */
export function AutoLockSheet({ isOpen, onClose, currentTimeout, onSelect }: AutoLockSheetProps) {
  if (!isOpen) return null;
  return <AutoLockPanel onClose={onClose} currentTimeout={currentTimeout} onSelect={onSelect} />;
}

/** Mounted per opening, so the pick starts from the saved value every time. */
function AutoLockPanel({ onClose, currentTimeout, onSelect }: Omit<AutoLockSheetProps, "isOpen">) {
  const [picked, setPicked] = useState(currentTimeout);

  return (
    <BottomSheet onClose={onClose} pb="pb-7" className="overflow-y-auto">
      <div className="flex flex-col gap-2 pt-0.5">
        <h3 className="text-[22px] leading-[1.1] font-bold text-jumpa-ink">Auto-lock</h3>
        <p className="text-xs leading-[1.4] tracking-jumpa-snug text-jumpa-ink-muted">
          Auto-lock protects your account by locking the screen and requiring your 6-digit login
          password whenever you step away or leave the app.
        </p>
      </div>

      <ul className="mt-4 flex flex-col">
        {AUTO_LOCK_OPTIONS.map((option, i) => (
          <li key={option.id} className={i > 0 ? "border-t border-jumpa-neutral-95" : undefined}>
            <OptionRow
              label={option.label}
              caption={`Locks your screen after ${option.label} of inactivity.`}
              recommended={option.id === RECOMMENDED}
              picked={option.id === picked}
              onPick={() => setPicked(option.id)}
            />
          </li>
        ))}
      </ul>

      <Button
        variant="brand"
        className="mt-4"
        onClick={() => {
          onSelect(picked);
          onClose();
        }}
      >
        Save
      </Button>
    </BottomSheet>
  );
}

function OptionRow({
  label,
  caption,
  recommended,
  picked,
  onPick,
}: {
  label: string;
  caption: string;
  recommended: boolean;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`tap -mx-3.25 flex h-14.75 w-[calc(100%+1.625rem)] items-center gap-2.5 rounded-panel px-4.25 text-left active:scale-[0.99] ${
        picked ? "bg-jumpa-primary-50" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-6.25 shrink-0 items-center justify-center rounded-pill ${
          picked ? "bg-jumpa-primary-600" : "bg-jumpa-primary-50"
        }`}
      >
        <Image
          src={picked ? "/images/auto-lock/clock-active.svg" : "/images/auto-lock/clock.svg"}
          alt=""
          width={14}
          height={14}
          className="size-3.5"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 leading-none">
        <span className="text-sm font-medium tracking-jumpa-snug text-jumpa-ink">
          {label}
          {recommended ? (
            <span className="ml-2 text-[10px] font-normal text-jumpa-primary-200">Recommended</span>
          ) : null}
        </span>
        <span className="truncate text-[10px] tracking-jumpa-snug text-jumpa-slate-500">{caption}</span>
      </span>
      <Image
        src={picked ? "/images/auto-lock/radio-on.svg" : "/images/auto-lock/radio-off.svg"}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0"
      />
    </button>
  );
}

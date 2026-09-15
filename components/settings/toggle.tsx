"use client";

import { useEffect, useState } from "react";

/** 38x24 switch supporting controlled or uncontrolled usage. */
export function Toggle({
  label,
  defaultOn = true,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [internalOn, setInternalOn] = useState(checked ?? defaultOn);

  useEffect(() => {
    if (checked !== undefined) {
      setInternalOn(checked);
    }
  }, [checked]);

  const isOn = checked !== undefined ? checked : internalOn;

  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) {
      setInternalOn(next);
    }
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={`relative h-6 w-9.5 shrink-0 rounded-pill tap ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${isOn ? "bg-jumpa-primary-600" : "bg-jumpa-neutral-250"}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-pill transition-[left,background-color] duration-200 ease-jumpa ${
          isOn ? "left-3.5 bg-jumpa-alt-400" : "left-0.5 bg-jumpa-white"
        }`}
      />
    </button>
  );
}

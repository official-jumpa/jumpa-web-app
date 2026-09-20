"use client";

import { useEffect, useState } from "react";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";

/** Stands in for the digits while the amount is hidden. */
const MASK = "*".repeat(6);

/** One account's amount, masked by its own eye like the hero balance. */
export function FiatBalance({
  amount,
  label,
}: {
  amount: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jumpa_balance_visible");
      if (saved !== null) {
        setVisible(saved === "true");
      }
    } catch {}
  }, []);

  return (
    <span className="flex items-center gap-2 text-jumpa-black">
      <span className="text-base leading-5.25 font-semibold">
        {visible ? amount : MASK}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisible((on) => !on);
        }}
        aria-label={`${visible ? "Hide" : "Show"} your ${label} balance`}
        className="cursor-pointer tap active:scale-90"
      >
        <ToggleIcon className="size-4" />
      </button>
    </span>
  );
}

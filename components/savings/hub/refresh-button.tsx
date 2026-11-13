"use client";

import { useState } from "react";
import { RefreshCwIcon } from "@/components/ui/icons/refresh-cw";

/** The hub header's reload, styled like its "+" beside it. */
export function RefreshButton({ onClick }: { onClick: () => void }) {
  // Each tap adds a full turn, so the icon spins forward without snapping back.
  const [turns, setTurns] = useState(0);

  return (
    <button
      type="button"
      aria-label="Refresh savings"
      onClick={() => {
        setTurns((count) => count + 1);
        onClick();
      }}
      className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
    >
      <RefreshCwIcon
        style={{ transform: `rotate(${turns * 360}deg)` }}
        className="size-4 transition-transform duration-700 ease-jumpa"
      />
    </button>
  );
}

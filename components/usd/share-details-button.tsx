"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

/** Hands the account details to the OS share sheet, or the clipboard without one. */
export function ShareDetailsButton({ text }: { text: string }) {
  const [note, setNote] = useState("");

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My USD account", text });
        return;
      } catch {
        // Dismissed, or no target — fall through to the clipboard.
      }
    }
    setNote(
      (await copyText(text))
        ? "Details copied to your clipboard."
        : "Could not copy the details.",
    );
  };

  return (
    <div className="flex flex-col">
      <Button variant="gradient" size="lg" onClick={share}>
        Share Details
      </Button>
      {/* Always mounted so the change is announced; costs no layout while empty. */}
      <p
        aria-live="polite"
        className={cn(
          "text-center text-xs leading-3.5 text-jumpa-neutral-425",
          note ? "pt-2" : "sr-only",
        )}
      >
        {note}
      </p>
    </div>
  );
}

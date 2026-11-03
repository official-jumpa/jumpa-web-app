"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ActionGrid } from "@/components/home/action-grid";
import type { AppActionId } from "@/components/home/actions";
import { HomeSection } from "@/components/home/home-section";
import { ReceiveOptionsSheet } from "@/components/transfer/receive-options-sheet";
import { SendOptionsSheet } from "@/components/transfer/send-options-sheet";
import { ScreenHeader } from "@/components/ui/screen-header";

/** Every shortcut in the app, grouped by what it is for. */
const GROUPS: { title: string; actions: AppActionId[] }[] = [
  { title: "Move money", actions: ["send", "deposit", "swap", "qr"] },
  {
    title: "Save & grow",
    actions: ["savings", "invest", "lending", "referral"],
  },
  { title: "Pay & track", actions: ["airtime", "data", "bill", "history"] },
  {
    title: "Accounts & help",
    actions: ["accounts", "wallets", "cards", "support"],
  },
];

/** The Quick Actions "More" tile: the whole shortcut set on one screen. */
export function MoreView() {
  const [sheet, setSheet] = useState<"send" | "receive" | null>(null);

  return (
    <div className="flex flex-col gap-6 px-4.5 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-10">
      <ScreenHeader back="/home" title="More" />

      {GROUPS.map(({ title, actions }, index) => (
        <div
          key={title}
          className="animate-rise stagger"
          style={{ "--i": index } as CSSProperties}
        >
          <HomeSection title={title} className="gap-2.5">
            <ActionGrid actions={actions} onSheet={setSheet} />
          </HomeSection>
        </div>
      ))}

      {sheet === "send" ? (
        <SendOptionsSheet onClose={() => setSheet(null)} />
      ) : null}
      {sheet === "receive" ? (
        <ReceiveOptionsSheet onClose={() => setSheet(null)} />
      ) : null}
    </div>
  );
}

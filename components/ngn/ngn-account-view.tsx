"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { NgnConfirm } from "@/components/ngn/ngn-confirm";
import { NgnIntro } from "@/components/ngn/ngn-intro";
import { NgnReady } from "@/components/ngn/ngn-ready";
import { NGN_OPENING_MS } from "@/lib/ngn-account";

type Stage = "intro" | "confirm" | "ready";

const DETAILS = "/ngn-account?view=details";

/** Opening a NGN account: what it gives you, what we hold, and the account itself. */
export function NgnAccountView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(() => {
      setOpening(false);
      setStage("ready");
    }, NGN_OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [opening]);

  const back =
    stage === "confirm"
      ? () => setStage("intro")
      : stage === "ready"
        ? () => router.replace("/home")
        : undefined;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        onBack={back}
        title="Open NGN Account"
        round
      />

      {stage === "intro" ? (
        <NgnIntro onStart={() => setStage("confirm")} />
      ) : null}
      {stage === "confirm" ? (
        <NgnConfirm onContinue={() => setOpening(true)} />
      ) : null}
      {stage === "ready" ? <NgnReady detailsHref={DETAILS} /> : null}

      {opening ? <LoadingModal label="Opening your NGN account" /> : null}
    </div>
  );
}

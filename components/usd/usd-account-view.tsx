"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { UsdConfirm } from "@/components/usd/usd-confirm";
import { UsdIntro } from "@/components/usd/usd-intro";
import { UsdReady } from "@/components/usd/usd-ready";
import { OPENING_MS } from "@/lib/usd-account";

type Stage = "intro" | "confirm" | "ready";

const DETAILS = "/usd-account?view=details";

/** Opening a USD account: what it gives you, what we hold, and the account itself. */
export function UsdAccountView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(() => {
      setOpening(false);
      setStage("ready");
    }, OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [opening]);

  // A receipt exits; it never steps back into the form that produced it.
  const back =
    stage === "confirm"
      ? () => setStage("intro")
      : stage === "ready"
        ? () => router.replace("/home")
        : undefined;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" onBack={back} title="Open USD Account" round />

      {stage === "intro" ? (
        <UsdIntro onStart={() => setStage("confirm")} />
      ) : null}
      {stage === "confirm" ? (
        <UsdConfirm onContinue={() => setOpening(true)} />
      ) : null}
      {stage === "ready" ? <UsdReady detailsHref={DETAILS} /> : null}

      {opening ? <LoadingModal label="Opening your USD account" /> : null}
    </div>
  );
}

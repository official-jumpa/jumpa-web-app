"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { NgnConfirm } from "@/components/ngn/ngn-confirm";
import { NgnIntro } from "@/components/ngn/ngn-intro";
import { NgnReady } from "@/components/ngn/ngn-ready";
import type { CreateNgnAccountInput } from "@/lib/validations/fossapay.validation";

type Stage = "intro" | "confirm" | "ready";

const DETAILS = "/ngn-account?view=details";

/** Opening an NGN account: intro explanation, form confirmation, and completion. */
export function NgnAccountView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [opening, setOpening] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if user already has an active account on mount
  useEffect(() => {
    let isMounted = true;
    async function checkExistingAccount() {
      try {
        console.log("[NgnAccountView] Checking existing NGN account...");
        const res = await fetch("/api/ngn-account");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.hasAccount && data.account?.status === "active") {
            console.log("[NgnAccountView] Active account found, redirecting to details");
            router.replace(DETAILS);
            return;
          }
        }
      } catch (err) {
        console.warn("[NgnAccountView] Error checking existing account:", err);
      } finally {
        if (isMounted) setCheckingExisting(false);
      }
    }

    checkExistingAccount();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleCreateAccount = async (formData: CreateNgnAccountInput) => {
    setOpening(true);
    setServerError(null);

    console.log("[NgnAccountView] Submitting NGN account creation...", {
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
    });

    try {
      const res = await fetch("/api/ngn-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[NgnAccountView] API returned error:", data);
        setServerError(data.error || "Failed to create NGN account. Please try again.");
        setOpening(false);
        return;
      }

      console.log("[NgnAccountView] Account created successfully!", data);
      setOpening(false);
      setStage("ready");
    } catch (err: any) {
      console.error("[NgnAccountView] Network error submitting account form:", err);
      setServerError(
        err.message || "A network error occurred. Please check your connection."
      );
      setOpening(false);
    }
  };

  const back =
    stage === "confirm"
      ? () => {
          setServerError(null);
          setStage("intro");
        }
      : stage === "ready"
        ? () => router.replace("/home")
        : undefined;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
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
        <NgnConfirm
          onContinue={handleCreateAccount}
          isLoading={opening}
          serverError={serverError}
        />
      ) : null}

      {stage === "ready" ? <NgnReady detailsHref={DETAILS} /> : null}

      {opening ? <LoadingModal label="Opening your NGN account..." /> : null}
    </div>
  );
}

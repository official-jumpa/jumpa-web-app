"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NgnConfirm } from "@/components/ngn/ngn-confirm";
import { NgnIntro } from "@/components/ngn/ngn-intro";
import { NgnReady } from "@/components/ngn/ngn-ready";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ScreenHeader } from "@/components/ui/screen-header";

type Stage = "intro" | "confirm" | "ready";

const DETAILS = "/ngn-account?view=details";

/** Opening an NGN account: intro explanation, form confirmation, and completion. */
export function NgnAccountView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [opening, setOpening] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if user already has an active account or needs KYC on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAccountAndKyc() {
      try {
        console.log(
          "[NgnAccountView] Checking existing NGN account and KYC...",
        );
        const [ngnRes, kycRes] = await Promise.all([
          fetch("/api/v1/ngn-account"),
          fetch("/api/v1/kyc"),
        ]);

        if (ngnRes.ok && isMounted) {
          const data = await ngnRes.json();
          // If user already has an active Aella account, redirect to details
          const hasActiveAccount = Boolean(
            data.hasAccount && data.account?.provider === "aella",
          );

          if (hasActiveAccount) {
            router.replace(DETAILS);
            return;
          }
        }

        if (kycRes.ok && isMounted) {
          const kycData = await kycRes.json();
          const isKycDone = Boolean(
            kycData?.isCompleted ||
              kycData?.status === "approved",
          );
          if (!isKycDone) {
            router.replace("/kyc");
            return;
          }
        }
      } catch (err) {
        console.warn("[NgnAccountView] Error checking account/KYC:", err);
      } finally {
        if (isMounted) setCheckingExisting(false);
      }
    }

    checkAccountAndKyc();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleCreateAccount = async (formData: any) => {
    setOpening(true);
    setServerError(null);

    try {
      const res = await fetch("/api/v1/ngn-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const rawText = await res.text().catch(() => "");
        const isHtmlOr5xx = /<!doctype|<html|502|504|bad gateway/i.test(rawText);
        data = {
          error: isHtmlOr5xx
            ? "Banking service is temporarily unavailable. Please try again shortly."
            : rawText.slice(0, 150) || "Failed to create NGN account.",
        };
      }

      if (!res.ok || data.success === false) {
        const errorCopy =
          data.error && !/<!doctype|<html|not valid json|unexpected token/i.test(data.error)
            ? data.error
            : "Failed to create NGN account. Please try again.";
        setServerError(errorCopy);
        setOpening(false);
        return;
      }

      setOpening(false);
      setStage("ready");
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isParserError = /not valid json|unexpected token|<!doctype|<html|bad gateway|502|504/i.test(msg);
      console.error("[NgnAccountView] Account creation failure:", msg);
      setServerError(
        isParserError
          ? "Banking service is temporarily unavailable. Please try again shortly."
          : msg || "A network error occurred. Please check your connection.",
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
      <ScreenHeader back="/home" onBack={back} title="Open NGN Account" round />

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

      {checkingExisting ? (
        <LoadingModal label="Verifying account status..." />
      ) : null}
      {opening ? <LoadingModal label="Opening your NGN account..." /> : null}
    </div>
  );
}

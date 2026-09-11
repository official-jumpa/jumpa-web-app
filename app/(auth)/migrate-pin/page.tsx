"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { PinNote } from "@/components/auth/pin-note";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

type MigrationStage = "current" | "new" | "confirm" | "confirm-existing";

//delete once everyone has migrated to v2
export default function MigratePinPage() {
  const router = useRouter();
  const [stage, setStage] = useState<MigrationStage>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [successInfo, setSuccessInfo] = useState({
    title: "PIN upgraded successfully",
    description:
      "Your wallet transaction PIN has been updated to 4 digits. You can now use it for all payments.",
  });

  const pinLength = stage === "current" ? 6 : 4;
  const pin = usePinInput(pinLength);

  useKeypadKeys({ ...pin, enabled: status === "idle" });

  useEffect(() => {
    if (!pin.complete || status !== "idle") return;

    if (stage === "confirm-existing") {
      handleConfirmExistingPin(pin.value);
    } else if (stage === "current") {
      setCurrentPin(pin.value);
      pin.clear();
      setStage("new");
    } else if (stage === "new") {
      setNewPin(pin.value);
      pin.clear();
      setStage("confirm");
    } else if (stage === "confirm") {
      if (pin.value !== newPin) {
        setError("PIN does not match. Please try again.");
        pin.clear();
        return;
      }
      handleMigratePin(pin.value);
    }
  }, [pin.complete, stage, newPin, status, pin.value]);

  const handleConfirmExistingPin = async (confirmedPin: string) => {
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/wallet-setup?step=migrate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-existing",
          pin: confirmedPin,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Incorrect PIN. Please try again.");
        setStatus("error");
        pin.clear();
        setTimeout(() => setStatus("idle"), 1000);
        return;
      }

      setSuccessInfo({
        title: "PIN confirmed successfully",
        description:
          "Your 4-digit PIN has been verified and your wallet is up to date",
      });
      setStatus("success");
    } catch (err) {
      setError("Network error. Please try again.");
      setStatus("error");
      pin.clear();
      setTimeout(() => setStatus("idle"), 1000);
    }
  };

  const handleMigratePin = async (confirmedNewPin: string) => {
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/wallet-setup?step=migrate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPin: currentPin,
          newPin: confirmedNewPin,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "PIN migration failed. Please try again.");
        setStatus("error");
        pin.clear();
        // If current PIN was wrong, send them back to stage 1
        if (data.error?.toLowerCase().includes("current pin")) {
          setStage("current");
          setCurrentPin("");
          setNewPin("");
        }
        setTimeout(() => setStatus("idle"), 1000);
        return;
      }

      setSuccessInfo({
        title: "PIN upgraded successfully",
        description:
          "Your wallet transaction PIN has been updated to 4 digits. You can now use it for all payments.",
      });
      setStatus("success");
    } catch (err) {
      setError("Network error. Please try again.");
      setStatus("error");
      pin.clear();
      setTimeout(() => setStatus("idle"), 1000);
    }
  };

  const handleBack = () => {
    setError(null);
    pin.clear();
    if (stage === "confirm") {
      setStage("new");
    } else if (stage === "new") {
      setStage("current");
    } else if (stage === "confirm-existing") {
      setStage("current");
    } else {
      router.replace("/home");
    }
  };

  const titles: Record<MigrationStage, { title: string; subtitle: string; label: string }> = {
    current: {
      title: "Update Transaction PIN",
      subtitle:
        "Jumpa now uses a 4-digit PIN for faster transaction approvals. Please enter your existing 6-digit PIN to update.",
      label: "Enter your current 6-digit PIN",
    },
    new: {
      title: "Set New 4-Digit PIN",
      subtitle: "4-digit code to authorize payments and sign transactions.",
      label: "Enter new 4-digit PIN",
    },
    confirm: {
      title: "Confirm New PIN",
      subtitle: "Please re-enter your new 4-digit PIN to verify.",
      label: "Confirm new 4-digit PIN",
    },
    "confirm-existing": {
      title: "Confirm 4-Digit PIN",
      subtitle:
        "If you have already set up a 4-digit PIN before, enter it below to confirm and verify your wallet.",
      label: "Enter your existing 4-digit PIN",
    },
  };

  const currentInfo = titles[stage];

  return (
    <AuthScreen
      header={<AuthHeader backHref="#" />}
      className="[--auth-pb:11px]"
    >
      <button
        type="button"
        onClick={handleBack}
        className="tap -mt-2 mb-2 self-start text-xs font-semibold text-jumpa-primary-600 active:scale-95"
      >
        ← {stage === "current" ? "Cancel" : "Back"}
      </button>

      <AuthHeading title={currentInfo.title}>
        {currentInfo.subtitle}
      </AuthHeading>

      <div className="mt-8 flex flex-1 flex-col gap-6">
        <PinDisplay
          key={stage}
          length={pinLength}
          value={pin.value}
          label={currentInfo.label}
          error={!!error}
          autoFocus
          onValueChange={(val) => {
            if (error) setError(null);
            pin.set(val);
          }}
        />

        {stage === "current" && (
          <div className="-mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setError(null);
                pin.clear();
                setStage("confirm-existing");
              }}
              className="tap text-center text-xs font-medium text-jumpa-primary-600 hover:text-jumpa-primary-700 underline underline-offset-4"
            >
              Already set up a 4-digit PIN before? Enter it here to confirm
            </button>
          </div>
        )}

        {stage === "confirm-existing" && (
          <div className="-mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setError(null);
                pin.clear();
                setStage("current");
              }}
              className="tap text-center text-xs font-medium text-jumpa-primary-600 hover:text-jumpa-primary-700 underline underline-offset-4"
            >
              Need to update from a 6-digit PIN? Switch to 6-digit update
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        )}

        {status === "submitting" && (
          <p className="text-center text-xs text-jumpa-neutral-500 animate-pulse">
            {stage === "confirm-existing"
              ? "Verifying your PIN..."
              : "Upgrading your wallet security..."}
          </p>
        )}

        <PinNote />
      </div>

      <NumericKeypad
        onDigit={(d) => {
          if (error) setError(null);
          pin.push(d);
        }}
        onBackspace={pin.backspace}
        disabled={status !== "idle"}
        className={KEYPAD_PANEL}
      />

      {status === "success" && (
        <SuccessSheet
          title={successInfo.title}
          description={successInfo.description}
          actionHref="/home"
          actionLabel="Go to Home"
        />
      )}
    </AuthScreen>
  );
}

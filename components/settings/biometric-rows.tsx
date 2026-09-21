"use client";

import { useEffect, useState } from "react";
import { SettingRow } from "@/components/settings/setting-row";
import { SettingRule } from "@/components/settings/setting-section";
import { Toggle } from "@/components/settings/toggle";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { ResultSheet } from "@/components/ui/result-sheet";
import {
  BiometricError,
  type BiometricUse,
  enrolBiometric,
  isBiometricAvailable,
  readEnrolled,
  removeBiometric,
} from "@/lib/biometrics";

const ROWS: { use: BiometricUse; label: string; aria: string }[] = [
  {
    use: "login",
    label: "Face ID/ Fingerprints for Login",
    aria: "Face ID or fingerprint for login",
  },
  {
    use: "transactions",
    label: "Face ID for Transactions",
    aria: "Face ID for transactions",
  },
];

/**
 * The two biometric switches. Both start **off** and only turn on once the
 * device prompt has actually been passed — a switch that is on before anything
 * was enrolled claims a protection that isn't there.
 */
export function BiometricRows({
  account,
}: {
  /** Identifies the credential to the authenticator. */
  account: { id: string; name: string };
}) {
  const [on, setOn] = useState<Record<BiometricUse, boolean>>({
    login: false,
    transactions: false,
  });
  const [pending, setPending] = useState<BiometricUse | null>(null);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<{
    message: string;
    retry: BiometricUse | null;
  } | null>(null);

  // localStorage is unreadable on the server, so the switches hydrate off and
  // catch up here. Anything already enrolled comes back on.
  useEffect(() => {
    setOn(readEnrolled());
    isBiometricAvailable().then(setSupported);
  }, []);

  const toggle = async (use: BiometricUse, next: boolean) => {
    if (!next) {
      removeBiometric(use);
      setOn((current) => ({ ...current, [use]: false }));
      return;
    }

    setPending(use);
    try {
      await enrolBiometric(use, account);
      setOn((current) => ({ ...current, [use]: true }));
    } catch (raised) {
      const failure =
        raised instanceof BiometricError
          ? raised
          : new BiometricError("Setup didn't complete. Please try again.");
      setError({ message: failure.message, retry: failure.retry ? use : null });
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      {ROWS.map(({ use, label, aria }, index) => (
        <div key={use} className="contents">
          {index > 0 ? <SettingRule /> : null}
          <SettingRow
            icon={FaceIdIcon}
            label={label}
            action={
              <Toggle
                label={aria}
                checked={on[use]}
                disabled={pending !== null || !supported}
                onChange={(next) => void toggle(use, next)}
              />
            }
          />
        </div>
      ))}

      {error ? (
        <ResultSheet
          title="Biometrics not set up"
          message={error.message}
          retryLabel="Try again"
          onRetry={
            error.retry
              ? () => {
                  const use = error.retry as BiometricUse;
                  setError(null);
                  void toggle(use, true);
                }
              : undefined
          }
          onClose={() => setError(null)}
        />
      ) : null}
    </>
  );
}

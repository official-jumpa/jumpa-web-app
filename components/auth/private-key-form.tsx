"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { NETWORKS } from "@/lib/networks";

export function PrivateKeyForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [network, setNetwork] = useState<string>(NETWORKS[0].id);
  const [privateKey, setPrivateKey] = useState("");
  const [masked, setMasked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const trimmedKey = privateKey.trim();
    if (!trimmedKey) {
      setError("Please paste or enter a private key");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("setupPrivateKey", trimmedKey);
      sessionStorage.setItem("setupChain", network);
    }

    router.push(nextHref);
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <label className="mt-7.75 flex flex-col gap-2">
          <span className="text-sm leading-4 font-medium text-jumpa-black">
            Network
          </span>
          <span className="flex h-14 items-center gap-2 rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 pr-4 pl-4 text-jumpa-primary-950">
            <GlobeIcon className="size-6 shrink-0" />
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="min-w-0 flex-1 appearance-none bg-transparent text-sm leading-4 font-medium outline-none cursor-pointer"
            >
              {NETWORKS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <CaretDownIcon className="size-6 shrink-0" />
          </span>
        </label>

        <label className="mt-5.25 flex flex-col gap-3">
          <span className="text-sm leading-4 font-medium text-jumpa-black">
            Private Key
          </span>
          <span className="flex h-25.5 items-center justify-center gap-7.5 rounded-panel border border-jumpa-primary-100 bg-jumpa-primary-50 py-5.75 pr-8.5 pl-6">
            <textarea
              value={privateKey}
              onChange={(event) => {
                setPrivateKey(event.target.value);
                if (error) setError(null);
              }}
              rows={2}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="Paste your private key"
              className={`h-6 w-61 resize-none bg-transparent text-[10px] leading-3 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-primary-950/40 ${
                masked ? "[-webkit-text-security:disc]" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setMasked((on) => !on)}
              aria-label={masked ? "Show private key" : "Hide private key"}
              className="shrink-0 text-jumpa-primary-950 cursor-pointer"
            >
              <EyeOffIcon className="size-6" />
            </button>
          </span>
        </label>

        {error && (
          <p className="mt-2 text-xs text-jumpa-danger px-1">{error}</p>
        )}

        <p className="mt-4.25 flex gap-2 text-jumpa-warning">
          <SealAlertIcon className="size-6 shrink-0" />
          <span className="flex flex-col gap-1 text-xs leading-3.5">
            <span className="font-medium">
              Passcode for your self-custodial wallet.
            </span>
            <span>
              A 6-digit PIN is used to sign transactions and unlock your wallet
              on your device. It's never sent unencrypted to Jumpa servers.
            </span>
          </span>
        </p>
      </div>

      <Button
        type="button"
        variant="gradient"
        size="lg"
        className="mt-8 cursor-pointer"
        onClick={handleContinue}
      >
        Continue
      </Button>
    </>
  );
}

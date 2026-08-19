"use client";

import { useState } from "react";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { Button } from "@/components/ui/button";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { NETWORKS } from "@/lib/networks";

/** Stand-in until a key can actually be decoded into an address. */
const DETECTED_ACCOUNT = "DU338E3829DWX...";

export function PrivateKeyForm({ nextHref }: { nextHref: string }) {
  const [privateKey, setPrivateKey] = useState("");
  const [masked, setMasked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
              defaultValue={NETWORKS[0].id}
              className="min-w-0 flex-1 appearance-none bg-transparent text-sm leading-4 font-medium outline-none"
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
              onChange={(event) => setPrivateKey(event.target.value)}
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
              className="shrink-0 text-jumpa-primary-950"
            >
              <EyeOffIcon className="size-6" />
            </button>
          </span>
        </label>

        <p className="mt-4.25 flex gap-2 text-jumpa-warning">
          <SealAlertIcon className="size-6 shrink-0" />
          <span className="flex flex-col gap-1 text-xs leading-3.5">
            <span className="font-medium">
              PIN is different from your password.
            </span>
            <span>
              A PIN is used to sign transactions on your device. It's never sent
              to Jumpa servers.
            </span>
          </span>
        </p>

        <p className="mt-12.25 flex items-center gap-2 rounded-panel border border-jumpa-alt-100 bg-jumpa-alt-50 py-4.25 pl-5.5">
          <span className="size-4.5 shrink-0 rounded-full bg-jumpa-alt-950" />
          <span className="flex flex-col gap-1 text-[10px] leading-3 text-jumpa-alt-950">
            <span>DETECTED ACCOUNT</span>
            <span className="font-medium">{DETECTED_ACCOUNT}</span>
          </span>
        </p>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="mt-8"
        onClick={() => setSubmitted(true)}
      >
        Continue
      </Button>

      {submitted ? (
        <SuccessSheet
          title="Verification successful"
          description="Your code has been verified successfully. You can now continue."
          actionHref={nextHref}
          actionLabel="Continue"
        />
      ) : null}
    </>
  );
}

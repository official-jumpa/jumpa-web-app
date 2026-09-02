"use client";

import { useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DEPOSIT_REFERENCE, FIAT_RAILS } from "@/lib/deposit";

/** Pay in from a bank app or a mobile money wallet. Same screen, two rails. */
export function FiatDeposit() {
  const [railId, setRailId] = useState(FIAT_RAILS[0].id);
  const rail =
    FIAT_RAILS.find((option) => option.id === railId) ?? FIAT_RAILS[0];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/receive" title="Deposit Fiat" />

      <div className="mt-6">
        <SegmentedToggle
          variant="split"
          value={railId}
          onChange={setRailId}
          options={FIAT_RAILS.map(({ id, label }) => ({ value: id, label }))}
        />
      </div>

      <p className="mt-5 text-xs leading-4.5 text-jumpa-neutral-700">
        {rail.intro}
      </p>

      <dl className="mt-3 flex flex-col gap-4 rounded-surface bg-jumpa-neutral-50 px-5 py-4">
        {rail.fields.map((field, index) => (
          <div key={field.label} className="flex flex-col gap-4">
            {/* -mb-px: the rule is a zero-height line, a 1px box would add flow. */}
            {index > 0 ? (
              <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[10px] leading-3 text-jumpa-neutral-400">
                  {field.label}
                </dt>
                <dd className="truncate text-sm leading-4.5 font-semibold text-jumpa-black">
                  {field.value}
                </dd>
              </div>
              {field.copy ? (
                <CopyButton value={field.value} className="shrink-0" />
              ) : null}
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-surface bg-jumpa-primary-50 px-5 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[10px] leading-3 text-jumpa-primary-600">
            Narration
          </p>
          <p className="truncate text-sm leading-4.5 font-semibold text-jumpa-primary-950">
            {DEPOSIT_REFERENCE}
          </p>
        </div>
        <CopyButton value={DEPOSIT_REFERENCE} className="shrink-0" />
      </div>

      <InfoNote tone="warning" className="mt-4">
        Put the narration on your transfer. Without it a deposit can take longer
        to reach your wallet.
      </InfoNote>
    </div>
  );
}

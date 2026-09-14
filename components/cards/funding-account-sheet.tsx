"use client";

import { useState } from "react";
import { CardField } from "@/components/cards/card-details-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { FundingAccount } from "@/lib/cards";

/** Which wallet the money leaves. Raised over the cards screen, as 1697:5338
 *  draws it; Continue carries the pick into the amount screen. */
export function FundingAccountSheet({
  accounts,
  onContinue,
  onClose,
}: {
  accounts: FundingAccount[];
  onContinue: (account: FundingAccount) => void;
  onClose: () => void;
}) {
  // The frame draws both rows selected; one pick is what it means.
  const [picked, setPicked] = useState(accounts[0]?.id);

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
        Choose funding Account
      </h2>

      <fieldset className="mt-4 flex flex-col gap-4">
        <legend className="sr-only">Funding account</legend>

        {accounts.map((account) => {
          const selected = account.id === picked;

          return (
            <label
              key={account.id}
              className="tap block cursor-pointer active:scale-[0.99]"
            >
              <input
                type="radio"
                name="funding-account"
                value={account.id}
                checked={selected}
                onChange={() => setPicked(account.id)}
                className="sr-only"
              />
              <CardField label={account.label} value={account.balance}>
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 right-4 flex size-5 -translate-y-1/2 items-center justify-center rounded-full inset-ring-1 ${
                    selected
                      ? "inset-ring-jumpa-primary-600"
                      : "inset-ring-jumpa-neutral-100"
                  }`}
                >
                  <span
                    className={`size-2.5 rounded-full bg-jumpa-primary-600 ${
                      selected ? "" : "opacity-0"
                    }`}
                  />
                </span>
              </CardField>
            </label>
          );
        })}
      </fieldset>

      {/* The frame's CTA reads "Yes, Freeze" — the slip every card sheet carries. */}
      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-4"
        onClick={() => {
          const account = accounts.find((entry) => entry.id === picked);
          if (account) onContinue(account);
        }}
      >
        Continue
      </Button>
    </BottomSheet>
  );
}

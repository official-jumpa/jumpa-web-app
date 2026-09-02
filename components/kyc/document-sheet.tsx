"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { KYC_DOCUMENTS, type KycDocument } from "@/lib/kyc";

/** Which ID the user is about to photograph. */
export function DocumentSheet({
  onClose,
  onContinue,
}: {
  onClose: () => void;
  onContinue: (document: KycDocument) => void;
}) {
  const [selected, setSelected] = useState(KYC_DOCUMENTS[0]);

  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <h2 className="text-center text-lg leading-6 font-semibold text-jumpa-black">
        Verify your ID Document
      </h2>
      <p className="mt-1 text-center text-xs leading-4.5 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {KYC_DOCUMENTS.map((document) => {
          const active = document.id === selected.id;
          return (
            <li key={document.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(document)}
                className={`tap flex h-14 w-full items-center gap-3 rounded-surface px-4 text-left active:scale-[0.99] ${
                  active
                    ? "bg-jumpa-primary-50 ring-1 ring-jumpa-primary-600"
                    : "bg-jumpa-neutral-50"
                }`}
              >
                <IdCardIcon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-jumpa-primary-600"
                />
                <span className="min-w-0 flex-1 truncate text-sm leading-4.5 font-semibold text-jumpa-black">
                  {document.label}
                </span>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-jumpa-black"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-center text-[10px] leading-4 text-jumpa-neutral-400">
        Your informations are protected safely
      </p>

      <Button
        variant="gradient"
        size="lg"
        className="mt-4"
        onClick={() => onContinue(selected)}
      >
        Continue
      </Button>
    </BottomSheet>
  );
}

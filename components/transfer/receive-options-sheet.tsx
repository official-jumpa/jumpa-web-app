"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  RECEIVE_OPTIONS,
  RECEIVE_ROW,
  RECEIVE_ROW_PICKED,
  RECEIVE_ROW_RESTING,
  type ReceiveOption,
  ReceiveOptionBody,
  type ReceiveOptionId,
} from "@/components/transfer/receive-options";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SheetPortal } from "@/components/ui/sheet-portal";

/**
 * Fiat or crypto, raised from the home hero. Picking a row marks it; Continue
 * acts on the choice.
 */
export function ReceiveOptionsSheet({
  onClose,
  options = RECEIVE_OPTIONS,
  onNavigate,
}: {
  onClose: () => void;
  options?: ReceiveOption[];
  /** Takes over Continue's navigation, for a host that keeps its own stack. */
  onNavigate?: (href: string) => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<ReceiveOptionId>();
  const [error, setError] = useState<string>();

  const proceed = () => {
    const option = options.find((entry) => entry.id === picked);
    if (!option) {
      setError("Pick how you want to add money");
      return;
    }

    if (onNavigate) onNavigate(option.href);
    else router.push(option.href);
  };

  return (
    <SheetPortal onClose={onClose}>
      {/* pt-3 tops the handle's own mb-3 up to the design's 24px. */}
      <div className="flex flex-col items-center gap-4 pt-3">
        <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
          Add money
        </h2>

        <div className="flex w-full flex-col gap-8">
          <div className="flex w-full flex-col gap-2">
            <ul className="flex w-full flex-col gap-2">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={picked === option.id}
                    onClick={() => {
                      setPicked(option.id);
                      setError(undefined);
                    }}
                    className={`${RECEIVE_ROW} ${picked === option.id ? RECEIVE_ROW_PICKED : RECEIVE_ROW_RESTING
                      }`}
                  >
                    <ReceiveOptionBody option={option} />
                  </button>
                </li>
              ))}
            </ul>
            <FieldError>{error}</FieldError>
          </div>

          <Button variant="gradientSheet" size="lg" onClick={proceed}>
            Continue
          </Button>
        </div>
      </div>
    </SheetPortal>
  );
}

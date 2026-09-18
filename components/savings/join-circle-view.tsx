"use client";

import { type ReactNode, useState } from "react";
import { PlanAction, PlanActions } from "@/components/savings/plan-actions";
import { SavingsLabel, savingsShell } from "@/components/savings/savings-field";
import { SavingsPanel, SavingsRule } from "@/components/savings/savings-form";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { findCircle, savingsHref } from "@/lib/savings";

/** Short enough to still be typing, so the miss note holds off until then. */
const MIN_LOOKUP = 3;

/** Join a circle from its name or invite link, then confirm what you joined. */
export function JoinCircleView() {
  const [ref, setRef] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Derived, so the card can never disagree with what is in the field.
  const circle = findCircle(ref);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRef(text.trim());
      setPasteError(null);
    } catch {
      setPasteError("Paste is blocked here — long-press the field instead.");
    }
  };

  if (joined && circle) {
    return (
      <TransferSuccess
        compact
        back={savingsHref("circle")}
        title="Successful"
        titleFirst
        amount={`You joined ${circle.name}`}
        note={`You are now saving towards ${circle.target} with this circle.`}
        // The screen after joining is not designed; it lands on the circles list.
        actions={
          <PlanActions>
            <PlanAction href={savingsHref("circle")} icon={ShieldCheckIcon}>
              View circle
            </PlanAction>
          </PlanActions>
        }
        ctaLabel="Back to home"
        ctaHref="/home"
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (circle) setJoined(true);
      }}
      className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
    >
      <TransferHeader back={savingsHref("circle")} title="Join circle" />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-3">
            <SavingsLabel>Enter circle name or link</SavingsLabel>
            <span className={savingsShell()}>
              <SearchAltIcon
                aria-hidden="true"
                className="size-6 shrink-0 text-jumpa-primary-200"
              />
              <input
                value={ref}
                onChange={(event) => {
                  setRef(event.target.value);
                  setPasteError(null);
                }}
                placeholder="e.g December Hangout"
                className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-semibold text-jumpa-black outline-none placeholder:font-medium placeholder:text-jumpa-primary-200"
              />
              <button
                type="button"
                onClick={paste}
                className="tap flex h-full shrink-0 items-center rounded-pill bg-[image:var(--gradient-jumpa-cta)] px-2.5 text-xs leading-4 font-semibold text-jumpa-alt-400 active:scale-95"
              >
                Paste circle link
              </button>
            </span>
          </label>

          <FieldError>
            {pasteError ??
              (!circle && ref.trim().length >= MIN_LOOKUP
                ? "No circle matches that name or link."
                : undefined)}
          </FieldError>
        </div>

        {circle ? (
          <SavingsPanel>
            <Row label="Name">
              <span className="text-xs leading-5 font-medium text-jumpa-black">
                {circle.name}
              </span>
            </Row>
            <SavingsRule />

            <Row label="Circle target">
              <span className="text-lg leading-5 font-bold text-jumpa-primary-500">
                {circle.target}
              </span>
            </Row>
            <SavingsRule />

            <Row label="Members">
              <Value>{circle.members} Members</Value>
            </Row>
            <SavingsRule />

            <Row label="Target date">
              <Value>{circle.targetDate}</Value>
            </Row>
          </SavingsPanel>
        ) : null}
      </div>

      {/* The frame sits the CTA straight under the card, not at the foot. */}
      {circle ? (
        <Button
          type="submit"
          variant="gradientSheet"
          size="lg"
          className="mt-7"
        >
          Join circle
        </Button>
      ) : null}
    </form>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5">
      <span className="text-[10px] leading-4 text-jumpa-black/50">{label}</span>
      {children}
    </div>
  );
}

/** The two rows the design prints in the deep brand purple. */
function Value({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm leading-4 font-medium text-jumpa-primary-950">
      {children}
    </span>
  );
}

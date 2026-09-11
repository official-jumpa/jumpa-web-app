"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { TextField } from "@/components/ui/text-field";
import {
  checkTagAvailability,
  isValidTag,
  normaliseTag,
  SIGN_UP_KEYS,
  TAG_MIN_LENGTH,
  type TagAvailability,
  writeSignUpValue,
} from "@/lib/sign-up";

/** Let typing settle before asking whether a tag is free. */
const SETTLE_MS = 400;

/** The form the rest of the app prints, e.g. the profile screen's `name@jumpa`. */
function fullTag(handle: string) {
  return `${handle}@jumpa`;
}

/** One free handle. The tick is part of the string, as the design draws it. */
function AvailabilityChip({
  handle,
  onPick,
}: {
  handle: string;
  onPick?: () => void;
}) {
  const label = `✓ @${handle} is available`;

  if (!onPick) {
    return (
      <span className="rounded-pill bg-jumpa-neutral-50 p-2.5 text-[10px] leading-3 font-medium text-jumpa-black">
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      className="tap rounded-pill bg-jumpa-neutral-50 p-2.5 text-[10px] leading-3 font-medium text-jumpa-black active:scale-95"
    >
      {label}
    </button>
  );
}

/** Tag entry with live availability, then the confirmation sheet. */
export function JumpaTagForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [availability, setAvailability] = useState<TagAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const ready = isValidTag(handle);

  useEffect(() => {
    if (!ready) {
      setAvailability(null);
      return;
    }

    // Drops a reply that lands after the user has typed on.
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkTagAvailability(handle);
      if (!cancelled) setAvailability(result);
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, ready]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!ready) {
      setError(`Your tag needs at least ${TAG_MIN_LENGTH} characters`);
      return;
    }
    if (availability && !availability.available) {
      setError("That tag is taken. Try one of the suggestions below.");
      return;
    }

    setError(null);
    setConfirming(true);
  };

  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/auth/wallet-setup?step=tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: handle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimError(data.error || "Failed to claim tag. Please try again.");
        setClaiming(false);
        return;
      }

      writeSignUpValue(SIGN_UP_KEYS.tag, fullTag(handle));
      setClaiming(false);
      setConfirming(false);
      router.push(nextHref);
    } catch {
      setClaimError("Network error. Please try again.");
      setClaiming(false);
    }
  };

  // Their own tag when it is free, otherwise the alternatives.
  const chips = availability
    ? availability.available
      ? [handle]
      : availability.suggestions
    : [];

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <TextField
            label="Enter Jumpa Tag"
            name="jumpaTag"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="@jumpatag"
            value={handle ? `@${handle}` : ""}
            onChange={(event) => {
              setHandle(normaliseTag(event.target.value));
              if (error) setError(null);
            }}
          />
          <FieldError>{error ?? undefined}</FieldError>
        </div>

        {chips.length ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {chips.map((option) => (
                <AvailabilityChip
                  key={option}
                  handle={option}
                  onPick={
                    option === handle ? undefined : () => setHandle(option)
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="mt-auto"
        >
          Continue
        </Button>
      </form>

      {confirming ? (
        <SheetPortal onClose={() => !claiming && setConfirming(false)}>
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
              Your Jumpa Tag
            </h2>

            <p className="w-full rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5 text-center text-sm leading-3.5 font-semibold text-jumpa-primary-600">
              {fullTag(handle)}
            </p>

            {claimError && (
              <p className="text-center text-xs text-jumpa-danger">
                {claimError}
              </p>
            )}

            <Button
              type="button"
              onClick={handleConfirm}
              disabled={claiming}
              variant="gradient"
              size="lg"
            >
              {claiming ? "Saving Tag..." : "Continue"}
            </Button>
          </div>
        </SheetPortal>
      ) : null}
    </>
  );
}

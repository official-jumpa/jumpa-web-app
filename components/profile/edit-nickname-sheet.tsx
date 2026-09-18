"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** The frame's own cap, printed under the field. */
const MAX_LENGTH = 30;

/**
 * Edit Nickname (2496:8685). Handle, title, one pill field, the character
 * note, then Continue — no label and no placeholder beyond the current value.
 */
export function EditNicknameSheet({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (next: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const next = draft.trim();
    if (!next) return setError("Enter a nickname.");
    if (next.length > MAX_LENGTH)
      return setError(`Keep it within ${MAX_LENGTH} characters.`);

    onSave(next);
    onClose();
  };

  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
          Edit Nickname
        </h2>

        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          // The design's own cap, so the field cannot exceed what it promises.
          maxLength={MAX_LENGTH}
          // biome-ignore lint/a11y/noAutofocus: the sheet exists to take this entry
          autoFocus
          aria-label="Nickname"
          aria-invalid={error ? true : undefined}
          className="h-12 w-full rounded-pill bg-jumpa-neutral-50 px-6 text-sm leading-4 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-secondary-200"
        />

        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <p className="text-center text-xs leading-3.5 text-jumpa-neutral-375">
            Enter within {MAX_LENGTH} characters
          </p>
        )}
      </div>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-8"
        onClick={submit}
      >
        Continue
      </Button>
    </SheetPortal>
  );
}

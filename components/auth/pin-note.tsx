import { InfoNote } from "@/components/auth/info-note";

export type PinNoteCopy = { heading: string; body: string };

/**
 * One entry per screen that draws a PIN note. They used to share a single
 * sentence, which said the same thing four times over and nothing about the
 * screen you were on.
 */
export const PIN_NOTES = {
  /** Sign-up: the transaction PIN is being chosen for the first time. */
  create: {
    heading: "Your PIN is not your password.",
    body: "It signs payments on this device and never leaves it. Pick one you will remember. Avoid 1234 or a birth year.",
  },
  /** Sign-up: the same PIN typed a second time. */
  confirm: {
    heading: "Both entries have to match.",
    body: "You will enter this PIN to approve every payment, so make sure it is one you can recall without a reminder.",
  },
  /** Upgrading an older wallet to the encrypted PIN. */
  migrate: {
    heading: "Only your PIN changes here.",
    body: "Your funds and recovery phrase are untouched. This upgrades how the PIN is stored on your device.",
  },
} as const satisfies Record<string, PinNoteCopy>;

/**
 * The warning under a PIN box. Every screen passes its own copy — there is no
 * default, so a new PIN screen has to say what it is for.
 */
export function PinNote({ note }: { note: PinNoteCopy }) {
  return (
    <InfoNote tone="warning">
      <span className="flex flex-col gap-2">
        <span className="font-semibold">{note.heading}</span>
        <span>{note.body}</span>
      </span>
    </InfoNote>
  );
}

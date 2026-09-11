import { InfoNote } from "@/components/auth/info-note";

/** The warning both PIN screens draw. Shared so the two cannot drift. */
export function PinNote() {
  return (
    <InfoNote tone="danger">
      <span className="flex flex-col gap-2">
        <span className="font-semibold">
          PIN is different from your password.
        </span>
        <span>
          A PIN is used to sign transactions on your device. It's never sent to
          Jumpa servers.
        </span>
      </span>
    </InfoNote>
  );
}

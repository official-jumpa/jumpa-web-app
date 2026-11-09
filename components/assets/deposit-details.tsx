import type { ReactNode } from "react";
import { DepositQr } from "@/components/assets/deposit-qr";
import { CopyButton } from "@/components/auth/copy-button";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { UsersIcon } from "@/components/ui/icons/users";

/** Renders a note string, turning **word** markers into bold <strong> spans. */
function renderNote(note: string) {
  let offset = 0;
  return note.split(/(\*\*[^*]+\*\*)/g).map((part) => {
    // Keyed by where the part starts, which is unique within the note.
    const at = offset;
    offset += part.length;
    return part.startsWith("**") && part.endsWith("**") ? (
      <strong key={at}>{part.slice(2, -2)}</strong>
    ) : (
      part
    );
  });
}

/** Network, address with copy, QR and deposit notes: the body of every crypto deposit screen. */
export function DepositDetails({
  network,
  address,
  notes,
  available = true,
  networkAction,
}: {
  network: string;
  address: string;
  /** `**word**` renders bold. */
  notes: string[];
  available?: boolean;
  /** Trailing control on the network row, such as Change. */
  networkAction?: ReactNode;
}) {
  return (
    <>
      <h2 className="mt-6 text-base leading-5 font-medium text-jumpa-black">
        Account Information
      </h2>

      <dl className="mt-3 flex flex-col gap-4 rounded-surface bg-jumpa-neutral-50 px-4 py-4">
        <div className="flex items-center gap-3">
          <GlobeIcon
            aria-hidden="true"
            className="size-6 shrink-0 text-jumpa-primary-600"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <dt className="text-xs leading-4 text-jumpa-neutral-500">
              Network
            </dt>
            <dd className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
              {network}
            </dd>
          </span>
          {networkAction}
        </div>

        {/* -mb-px: the design draws a zero-height line, a 1px box would add flow. */}
        <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />

        <div className="flex items-center gap-3">
          <UsersIcon
            aria-hidden="true"
            className="size-6 shrink-0 text-jumpa-primary-600"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <dt className="text-xs leading-4 text-jumpa-neutral-500">
              Wallet address
            </dt>
            <dd className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
              {address}
            </dd>
          </span>
          {available && <CopyButton value={address} />}
        </div>
      </dl>

      <div className="mt-4 flex h-73.5 items-center justify-center rounded-surface bg-jumpa-neutral-50">
        {available ? (
          <DepositQr value={address} />
        ) : (
          <p className="text-sm text-jumpa-neutral-400 text-center px-6">
            This network is not yet available
          </p>
        )}
      </div>

      <h2 className="mt-4 text-sm leading-4.5 font-medium text-jumpa-black">
        Deposit info
      </h2>

      <ul className="mt-3 flex flex-col gap-1 rounded-surface bg-jumpa-primary-50 px-4 py-4 text-xs leading-5 font-medium text-jumpa-black">
        {notes.map((note) => (
          <li key={note} className="flex gap-1.5">
            <span aria-hidden="true">&bull;</span>
            <span>{renderNote(note)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

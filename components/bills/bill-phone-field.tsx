"use client";

import { useRef } from "react";
import { NetworkPicker } from "@/components/bills/network-picker";
import { FieldError } from "@/components/ui/field-error";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { ContactIcon } from "@/components/ui/icons/contact";
import { detectCarrierFromPhone } from "@/lib/bills";
import { normalizeNigerianPhone } from "@/lib/validations/bills.validation";

/** The Contact Picker API; only some browsers ship it, so it is checked on tap. */
type ContactsNavigator = Navigator & {
  contacts?: {
    select: (
      properties: "tel"[],
      options?: { multiple?: boolean },
    ) => Promise<{ tel?: string[] }[]>;
  };
};

/**
 * Carrier and number for a top-up. Typing a number picks its carrier, the caret
 * overrides it, and the contact disc fills the number from the address book.
 */
export function BillPhoneField({
  phone,
  network,
  error,
  onPhoneChange,
  onNetworkChange,
}: {
  phone: string;
  network: string;
  /** The phone or network message, whichever needs fixing first. */
  error?: string;
  onPhoneChange: (next: string) => void;
  onNetworkChange: (next: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const lastDetected = useRef<string | null>(detectCarrierFromPhone(phone));

  const changePhone = (next: string) => {
    onPhoneChange(next);
    const detected = detectCarrierFromPhone(next);
    if (detected && detected !== lastDetected.current) {
      lastDetected.current = detected;
      onNetworkChange(detected);
    } else if (!next) {
      lastDetected.current = null;
    }
  };

  const pickContact = async () => {
    const contacts = (navigator as ContactsNavigator).contacts;
    // No picker in this browser: the field is the next best place to go.
    if (!contacts) {
      input.current?.focus();
      return;
    }
    try {
      const [picked] = await contacts.select(["tel"]);
      const tel = picked?.tel?.[0];
      if (tel) changePhone(normalizeNigerianPhone(tel));
    } catch (err) {
      console.warn("[BillPhoneField] Contact picker closed:", err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs leading-none font-medium tracking-jumpa-snug text-jumpa-ink-muted">
        Phone number
      </span>

      <div className="flex items-center gap-1.75">
        <NetworkPicker network={network} onChange={onNetworkChange} />

        <span className="flex h-14 min-w-0 flex-1 items-center gap-3.25 rounded-panel bg-jumpa-neutral-50 pr-4.5 pl-4.25">
          <input
            ref={input}
            value={phone}
            onChange={(event) => changePhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="0801 234 5678"
            aria-label="Phone number"
            aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 bg-transparent text-sm leading-none tracking-jumpa-snug text-jumpa-ink caret-jumpa-primary-600 outline-none placeholder:text-jumpa-ink-subtle"
          />
          {/* TODO: open recent numbers from here once they have a design and a data source. */}
          <ChevronRightIcon className="size-5 shrink-0 rotate-90 text-jumpa-neutral-270" />
          <button
            type="button"
            aria-label="Choose from contacts"
            onClick={pickContact}
            className="tap flex h-8.75 w-8.5 shrink-0 items-center justify-center rounded-full bg-jumpa-lilac-100 text-jumpa-primary-600 active:scale-95"
          >
            <ContactIcon className="h-4.25 w-3.5" />
          </button>
        </span>
      </div>

      <FieldError>{error}</FieldError>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { BillBanner } from "@/components/bills/bill-banner";
import { FieldLabel } from "@/components/transfer/field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ScreenHeader } from "@/components/ui/screen-header";
import { MOBILE_NETWORKS, PHONE_NUMBER_MIN } from "@/lib/bills";
import {
  checkLength,
  type FormErrors,
  revealFirstError,
} from "@/lib/validation";

type Field = "phone" | "network";

/**
 * Who to top up: the offer banner, a phone number and a carrier. Shared by the
 * airtime and data flows, which differ only in what Continue opens.
 */
export function RechargeForm({
  title,
  phone,
  network,
  onPhoneChange,
  onNetworkChange,
  onContinue,
}: {
  title: string;
  phone: string;
  network: string;
  onPhoneChange: (next: string) => void;
  onNetworkChange: (next: string) => void;
  onContinue: () => void;
}) {
  const [errors, setErrors] = useState<FormErrors<Field>>({});
  const fields = useRef<HTMLDivElement>(null);

  const clear = (field: Field) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const found: FormErrors<Field> = {
      phone: checkLength(
        phone,
        PHONE_NUMBER_MIN,
        "Phone numbers",
        "Enter the phone number to top up.",
      ),
      network: network ? undefined : "Choose the network for this number.",
    };

    const blocked = Object.values(found).some(Boolean);
    setErrors(found);
    if (blocked) revealFirstError(fields.current);
    else onContinue();
  };

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="px-4.5 pt-6 pb-4">
        <ScreenHeader back="/home" title={title} round />
      </div>

      <BillBanner />

      {/* The white sheet laps the banner, as the design draws it. */}
      <div
        ref={fields}
        className="-mt-3 flex flex-1 flex-col gap-5 rounded-t-dock bg-jumpa-white px-4.5 pt-6"
      >
        <label className="flex flex-col gap-2">
          <FieldLabel>Phone Number</FieldLabel>
          <span
            className={`flex h-13 items-center rounded-pill border bg-jumpa-primary-50 px-4.5 ${
              errors.phone ? "border-jumpa-danger" : "border-jumpa-primary-600"
            }`}
          >
            <input
              value={phone}
              onChange={(event) => {
                clear("phone");
                onPhoneChange(event.target.value);
              }}
              inputMode="tel"
              placeholder="0913829919"
              aria-invalid={Boolean(errors.phone)}
              className="w-full bg-transparent text-base leading-4.5 font-medium text-jumpa-primary-950 caret-jumpa-primary-600 outline-none placeholder:text-jumpa-secondary-200"
            />
          </span>
          <FieldError>{errors.phone}</FieldError>
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel>Choose Network</FieldLabel>
          <ul className="flex items-start justify-between gap-2 rounded-surface bg-jumpa-neutral-50 px-4 py-4">
            {MOBILE_NETWORKS.map((entry) => {
              const active = entry.id === network;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      clear("network");
                      onNetworkChange(entry.id);
                    }}
                    className="tap flex w-16 flex-col items-center gap-1.5 active:scale-95"
                  >
                    <span
                      // Carrier brand disc; MTN and Glo carry their own in the art.
                      style={{ backgroundColor: entry.tint }}
                      className={`flex size-11 items-center justify-center overflow-hidden rounded-full ${
                        active ? "ring-2 ring-jumpa-primary-600" : ""
                      }`}
                    >
                      <Image
                        src={entry.logo}
                        alt=""
                        width={44}
                        height={44}
                        className={
                          entry.tint
                            ? "size-6 object-contain"
                            : "size-full object-cover"
                        }
                      />
                    </span>
                    <span className="text-[10px] leading-3 font-medium text-jumpa-primary-950">
                      {entry.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <FieldError>{errors.network}</FieldError>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="mt-auto"
          onClick={submit}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

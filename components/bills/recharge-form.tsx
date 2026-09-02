"use client";

import Image from "next/image";
import { BillBanner } from "@/components/bills/bill-banner";
import { FieldLabel } from "@/components/transfer/field";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { MOBILE_NETWORKS, PHONE_NUMBER_MIN } from "@/lib/bills";

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
  const ready =
    phone.replace(/\D/g, "").length >= PHONE_NUMBER_MIN && Boolean(network);

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="px-4.5 pt-6 pb-4">
        <ScreenHeader back="/home" title={title} round />
      </div>

      <BillBanner />

      {/* The white sheet laps the banner, as the design draws it. */}
      <div className="-mt-3 flex flex-1 flex-col gap-5 rounded-t-dock bg-jumpa-white px-4.5 pt-6">
        <label className="flex flex-col gap-2">
          <FieldLabel>Phone Number</FieldLabel>
          <span className="flex h-13 items-center rounded-pill border border-jumpa-primary-600 bg-jumpa-primary-50 px-4.5">
            <input
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              inputMode="tel"
              placeholder="0913829919"
              className="w-full bg-transparent text-base leading-4.5 font-medium text-jumpa-primary-950 caret-jumpa-primary-600 outline-none placeholder:text-jumpa-secondary-200"
            />
          </span>
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
                    onClick={() => onNetworkChange(entry.id)}
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
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="mt-auto"
          disabled={!ready}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

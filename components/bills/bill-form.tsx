"use client";

import Link from "next/link";
import { type ReactNode, useRef } from "react";
import { BillPhoneField } from "@/components/bills/bill-phone-field";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { PHONE_NUMBER_MIN } from "@/lib/bills";
import {
  checkLength,
  type FormErrors,
  revealFirstError,
} from "@/lib/validation";
import { isValidNigerianPhone } from "@/lib/validations/bills.validation";

export type BillField = "phone" | "network" | "account" | "amount" | "plan";

/** Number, carrier and naira account: the checks both bill screens run on Proceed. */
export function checkRecipient(
  phone: string,
  network: string,
  hasAccount: boolean,
): FormErrors<BillField> {
  let phoneError = checkLength(
    phone,
    PHONE_NUMBER_MIN,
    "Phone numbers",
    "Enter the phone number to top up.",
  );
  if (!phoneError && !isValidNigerianPhone(phone)) {
    phoneError = "Enter a valid Nigerian phone number (e.g. 08031234567)";
  }
  return {
    phone: phoneError,
    network: network ? undefined : "Choose the network for this number.",
    account: hasAccount ? undefined : "Please create a Naira account first",
  };
}

/**
 * The airtime and data screen: header, number and carrier, the flow's own
 * fields, and Proceed pinned to the bottom so a long plan list never hides it.
 */
export function BillForm({
  title,
  phone,
  network,
  errors,
  complete,
  onPhoneChange,
  onNetworkChange,
  onProceed,
  children,
}: {
  title: string;
  phone: string;
  network: string;
  errors: FormErrors<BillField>;
  /** The flow's own fields (amount or plan) are filled; with a valid number and carrier, Proceed turns solid. */
  complete: boolean;
  onPhoneChange: (next: string) => void;
  onNetworkChange: (next: string) => void;
  /** True when the form is complete; false keeps the screen and reveals the first flagged field. */
  onProceed: () => boolean;
  children: ReactNode;
}) {
  const fields = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        ref={fields}
        className="flex flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6"
      >
        <div className="-mx-1">
          <ScreenHeader back="/home" title={title} titleStyle="bill" round />
        </div>

        <div className="mt-8">
          <BillPhoneField
            phone={phone}
            network={network}
            error={errors.phone ?? errors.network}
            onPhoneChange={onPhoneChange}
            onNetworkChange={onNetworkChange}
          />
        </div>

        {children}

        {errors.account ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-tile border border-jumpa-danger/30 bg-jumpa-danger/10 px-4 py-3 text-xs leading-4 font-medium text-jumpa-danger">
            <span>{errors.account}</span>
            <Link
              href="/ngn-account"
              className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Create Account
            </Link>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 bg-jumpa-white px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <Button
          variant={
            complete && network && isValidNigerianPhone(phone)
              ? "brand"
              : "softPrimary"
          }
          size="lg"
          onClick={() => {
            if (!onProceed()) revealFirstError(fields.current);
          }}
        >
          Proceed
        </Button>
      </div>
    </div>
  );
}

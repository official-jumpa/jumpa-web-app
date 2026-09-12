"use client";

import Image from "next/image";
import { CopyButton } from "@/components/auth/copy-button";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { DEPOSIT_ACCOUNT, DEPOSIT_REFERENCE } from "@/lib/fiat-deposit";

/** One side of the deposit, as the sheet restates it. */
type Side = { value: string; symbol: string; icon: string };

const ROW = "flex items-start gap-1 font-medium text-jumpa-black";

function PaymentLeg({ label, side }: { label: string; side: Side }) {
  return (
    <div className="flex h-12 items-center gap-2.5 rounded-surface bg-jumpa-neutral-60 p-2.5">
      <span className="flex min-w-0 flex-1 flex-col px-2.5">
        <span className="text-[10px] leading-3 text-jumpa-black/50 uppercase">
          {label}
        </span>
        <span className="truncate text-base leading-4 font-medium text-jumpa-black">
          {side.value}
        </span>
      </span>

      <span className="flex h-full shrink-0 items-center gap-1 rounded-pill bg-jumpa-neutral-95 px-1.5">
        <Image
          src={side.icon}
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0 rounded-full object-contain"
        />
        <span className="text-[10px] leading-4.5 font-semibold text-jumpa-black">
          {side.symbol}
        </span>
      </span>
    </div>
  );
}

/**
 * Where to send the money, once a quote has been taken. The account and the
 * reference are placeholders — no on-ramp issues them yet.
 */
export function PaymentSheet({
  pay,
  receive,
  onConfirm,
  onClose,
}: {
  pay: Side;
  receive: Side;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <SheetPortal onClose={onClose}>
      {/* pt-3 tops the handle's own mb-3 up to the design's 24px. */}
      <div className="flex flex-col items-center gap-4 pt-3">
        <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
          Add money
        </h2>

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2 pl-2.5">
            <span className="text-xs leading-5 font-medium text-jumpa-black">
              Buy Crypto/Deposit
            </span>
            <span className="flex h-5 shrink-0 items-center rounded-xl bg-jumpa-primary-525 px-2.5 text-[10px] leading-4 text-jumpa-primary-50">
              Awaiting transfer
            </span>
          </div>

          {/* -mb-px: the design draws a zero-height line. */}
          <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />

          <div className="flex flex-col gap-2">
            <PaymentLeg label="You pay" side={pay} />
            <PaymentLeg label="You receive" side={receive} />
          </div>

          <div className="flex flex-col gap-2.5 rounded-xl border border-jumpa-secondary-400 bg-jumpa-primary-100 p-2.5">
            <p className={ROW}>
              <span className="min-w-0 flex-1 text-xs leading-3.5">
                Bank Name
              </span>
              <span className="shrink-0 text-[10px] leading-3.5">
                {DEPOSIT_ACCOUNT.bank}
              </span>
            </p>

            <p className={ROW}>
              <span className="min-w-0 flex-1 text-xs leading-3.5">
                Account Name
              </span>
              <span className="shrink-0 text-[10px] leading-3.5">
                {DEPOSIT_ACCOUNT.name}
              </span>
            </p>

            <span className="-mb-px block h-px w-full bg-jumpa-secondary-400/40" />

            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] leading-3 text-jumpa-black/50 uppercase">
                  Account number
                </span>
                <span className="truncate text-base leading-4 font-medium text-jumpa-black">
                  {DEPOSIT_ACCOUNT.number}
                </span>
              </span>
              <CopyButton
                variant="chip"
                label="Copy"
                value={DEPOSIT_ACCOUNT.number}
              />
            </div>
          </div>

          <p className="px-2.5 text-[10px] leading-4 text-jumpa-black/50">
            Payment Reference:{" "}
            <b className="font-bold text-jumpa-black">{DEPOSIT_REFERENCE}</b>
          </p>

          <Button variant="gradientSheet" size="lg" onClick={onConfirm}>
            I've made the payment
          </Button>
        </div>
      </div>
    </SheetPortal>
  );
}

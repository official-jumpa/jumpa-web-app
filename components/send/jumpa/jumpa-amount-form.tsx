import Image from "next/image";
import { RecipientCard } from "@/components/send/jumpa/recipient-card";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { PenLineIcon } from "@/components/ui/icons/pen-line";
import {
  type JumpaRecipient,
  NARRATION_MAX_BYTES,
  narrationBytes,
  type SendAsset,
} from "@/lib/jumpa-send";
import type { FormErrors } from "@/lib/validation";

export type AmountField = "amount" | "narration";

const LABEL = "text-sm leading-4.5 font-medium text-jumpa-black";

/** The box border goes red on its own field's error, as every other form does. */
const box = (invalid: boolean) =>
  `rounded-tile border ${invalid ? "border-jumpa-danger" : "border-jumpa-primary-50"}`;

/** How much, in which currency, and an optional note that rides as the memo. */
export function JumpaAmountForm({
  recipient,
  asset,
  amount,
  narration,
  balance,
  rate,
  errors,
  onAmountChange,
  onNarrationChange,
  onPickAsset,
  onEditRecipient,
  onContinue,
}: {
  recipient: JumpaRecipient;
  asset: SendAsset;
  /** Display string, already grouped. */
  amount: string;
  narration: string;
  balance: string;
  rate: string | null;
  errors: FormErrors<AmountField>;
  onAmountChange: (value: string) => void;
  onNarrationChange: (value: string) => void;
  onPickAsset: () => void;
  onEditRecipient: () => void;
  onContinue: () => void;
}) {
  const filled = Number(amount.replace(/,/g, "")) > 0;

  return (
    <form
      noValidate
      className="mt-5.25 flex flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div className="flex flex-col gap-3.5">
        <RecipientCard
          recipient={recipient}
          variant="chosen"
          trailing={
            <button
              type="button"
              onClick={onEditRecipient}
              aria-label="Change recipient"
              className="tap flex size-7.25 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-50 active:scale-95"
            >
              <PenLineIcon className="size-4 text-jumpa-primary-600" />
            </button>
          }
        />

        <label htmlFor="jumpa-amount" className={LABEL}>
          Amount
        </label>
        <div className={`flex h-[129px] flex-col ${box(Boolean(errors.amount))}`}>
          <div className="flex h-23.25 shrink-0 items-start pt-5 pr-1.75 pl-4.25">
            <div className="flex h-10.75 w-full items-center gap-3">
              <input
                id="jumpa-amount"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                aria-invalid={errors.amount ? true : undefined}
                className="min-w-0 flex-1 bg-transparent text-[34px] leading-10.75 font-semibold text-jumpa-slate-600 outline-none placeholder:text-jumpa-slate-600"
              />
              <button
                type="button"
                onClick={onPickAsset}
                aria-label={`Currency: ${asset.code}. Change`}
                className="tap flex h-10.75 min-w-27.75 shrink-0 items-center gap-2.5 rounded-panel border border-jumpa-primary-50 bg-jumpa-surface pr-2 pl-3.5 active:scale-[0.98]"
              >
                <Image
                  src={asset.icon}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover"
                />
                <span className="text-lg leading-4.5 font-medium text-jumpa-slate-600">
                  {asset.code}
                </span>
                <ChevronDownIcon className="size-3.5 text-jumpa-slate-600" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 border-t border-jumpa-primary-50 px-4.25 text-xs leading-4.5 text-jumpa-neutral-400">
            <span className="truncate">
              Balance: <span className="font-medium text-jumpa-slate-600">{balance}</span>
            </span>
            {rate ? (
              <span className="shrink-0">
                Rate: <span className="font-medium text-jumpa-slate-600">{rate}</span>
              </span>
            ) : null}
          </div>
        </div>
        <FieldError>{errors.amount}</FieldError>

        <label htmlFor="jumpa-narration" className={LABEL}>
          Narration{" "}
          <span className="text-xs font-normal text-jumpa-neutral-350">(Optional)</span>
        </label>
        <div className={`relative h-[100px] ${box(Boolean(errors.narration))}`}>
          <textarea
            id="jumpa-narration"
            value={narration}
            onChange={(event) => onNarrationChange(event.target.value)}
            placeholder="What is this payment for?"
            aria-invalid={errors.narration ? true : undefined}
            className="size-full resize-none bg-transparent px-4.25 py-2.75 text-sm leading-4.5 text-jumpa-black outline-none placeholder:text-jumpa-neutral-350"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-2 text-[10px] leading-3 text-jumpa-neutral-350"
          >
            {narrationBytes(narration)}/{NARRATION_MAX_BYTES}
          </span>
        </div>
        <FieldError>{errors.narration}</FieldError>
      </div>

      <div className="mt-auto pt-6">
        <Button type="submit" variant={filled ? "gradient" : "softBrand"} size="lg">
          Continue
        </Button>
      </div>
    </form>
  );
}

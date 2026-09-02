"use client";

import Image from "next/image";
import { useState } from "react";
import {
  EMPTY_WALLET_FORM,
  WalletAddressForm,
  type WalletForm,
} from "@/components/send/wallet-address-form";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { getAssetLogo } from "@/lib/assets";
import {
  DEMO_PIN,
  SEND_BALANCE,
  SWAP_QUOTE,
  shortenAddress,
} from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Chips this flow offers; the design drops the 5 the bank flow shows. */
const CHIPS = [25, 50, 100] as const;

/** On-chain send, end to end: address, amount, review, PIN, receipt. */
export function WalletAddressView({ promotions }: { promotions: Promotion[] }) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [form, setForm] = useState<WalletForm>(EMPTY_WALLET_FORM);
  const [amount, setAmount] = useState("");

  const network = form.network.replace(" ", " - ");
  const short = shortenAddress(form.address, 18, 0);

  const details = (
    <DetailList>
      <DetailRow label="Network" value={form.network.split(" ")[0]} />
      <DetailRow label="Asset" value={form.asset} />
      <DetailRow label="Network fee" value={SWAP_QUOTE.networkFee} />
      <DetailRow
        label="Settlement time"
        value={SWAP_QUOTE.settlement}
        rule={false}
      />
    </DetailList>
  );

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/home"
        amount={`${amount} ${form.asset}`}
        note={
          <>
            Your money is on its way to{" "}
            <b className="font-bold">{shortenAddress(form.address)}</b>
          </>
        }
        details={details}
        promotions={promotions}
      />
    );
  }

  if (stage === "amount") {
    return (
      <>
        <AmountScreen
          recipient={<RecipientTag primary={`${short}…`} secondary={network} />}
          onClose={() => setStage("form")}
          amount={amount}
          symbol={form.asset}
          balance={SEND_BALANCE.balance}
          chips={CHIPS}
          rate={`1 ${form.asset} = ${SWAP_QUOTE.rate} XLM`}
          caption="Always verify the address is correct. Payments to wrong addresses cannot be reversed."
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <div className="flex items-center justify-between gap-3">
                <PairPill
                  left="Sending"
                  right={form.asset}
                  media={
                    <Image
                      src={getAssetLogo(form.asset)}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-contain"
                    />
                  }
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm leading-4 font-medium text-jumpa-black">
                    To
                  </span>
                  <RecipientTag
                    primary={`${short}…`}
                    secondary={network}
                    align="right"
                  />
                </span>
              </div>
            }
            headline={`${amount} ${form.asset}`}
            confirmLabel="Confirm payment"
            onConfirm={() => setSheet("pin")}
            onClose={() => setSheet(null)}
          >
            {details}
          </ReviewSheet>
        ) : null}

        {sheet === "pin" ? (
          <TransferPinSheet
            error={pinError}
            onRetry={() => setPinError(false)}
            onClose={() => setSheet("review")}
            onComplete={(pin) => {
              if (pin === DEMO_PIN) setStage("done");
              else setPinError(true);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/send" title="Wallet address" />
      <WalletAddressForm
        form={form}
        onChange={setForm}
        onPickRecent={(contact) =>
          setForm({
            ...form,
            address: contact.address,
            network: contact.network,
            pasted: false,
          })
        }
        onProceed={() => setStage("amount")}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { type Address, getAddress, isAddressEqual } from "viem";
import { CloseButton } from "@/components/transfer/close-button";
import { FIELD_INPUT, Field, PasteAction } from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { Button } from "@/components/ui/button";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { walletAddressError } from "@/lib/nimiq/recipients";
import { shortenAddress } from "@/lib/transfer";

const short = (address: string) => shortenAddress(address, 6, 4);

/** Picks where a top-up's USDT goes: the connected wallet, or another Polygon wallet. */
export function TopUpRecipientSheet({
  own,
  current,
  saved,
  onPick,
  onClose,
}: {
  own: Address;
  /** The other wallet chosen so far; undefined means the connected one. */
  current?: Address;
  /** Wallets this device topped up before. */
  saved: string[];
  /** Undefined picks the connected wallet. */
  onPick: (recipient?: Address) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string>(current ?? "");
  const [showError, setShowError] = useState(false);
  const problem = walletAddressError(draft);
  const others = saved.filter(
    (wallet) => !isAddressEqual(wallet as Address, own),
  );

  const choose = (address: string) => {
    const wallet = getAddress(address.trim());
    onPick(isAddressEqual(wallet, own) ? undefined : wallet);
  };

  const submit = () => {
    setShowError(true);
    if (!problem) choose(draft);
  };

  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg leading-normal font-medium text-jumpa-black">
            Send USDT to
          </h2>
          <CloseButton onClick={onClose} label="Close" size="sm" />
        </div>

        <OptionRow
          Icon={WalletIcon}
          title="My Nimiq Pay wallet"
          caption={short(own)}
          onClick={() => onPick(undefined)}
        />

        <Field
          label="Another wallet on Polygon"
          error={showError ? problem : undefined}
        >
          <input
            value={draft}
            onChange={(event) => {
              setShowError(false);
              setDraft(event.target.value);
            }}
            placeholder="0x…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={showError && Boolean(problem)}
            className={FIELD_INPUT}
          />
          <PasteAction onPaste={(text) => setDraft(text.trim())} />
        </Field>

        {others.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs leading-5 font-medium text-jumpa-black">
              Recent wallets
            </h3>
            <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
              {others.map((wallet) => (
                <li key={wallet}>
                  <OptionRow
                    Icon={WalletIcon}
                    title={short(wallet)}
                    caption="Topped up before"
                    onClick={() => choose(wallet)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="flex items-center gap-2 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
          <CircleInformationIcon
            aria-hidden="true"
            className="size-5 shrink-0 text-jumpa-primary-600"
          />
          <span className="text-xs leading-4 font-medium text-jumpa-primary-600">
            Polygon wallets only. USDT sent to a wrong address can&rsquo;t be
            recovered.
          </span>
        </p>
      </div>

      <Button variant="gradient" size="lg" className="mt-6" onClick={submit}>
        Use this wallet
      </Button>
    </SheetPortal>
  );
}

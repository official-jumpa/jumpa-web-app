"use client";

import {
  FIELD_INPUT,
  FIELD_SHELL,
  Field,
  FieldLabel,
  PasteAction,
  SelectField,
} from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { Button } from "@/components/ui/button";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { getAssetLogo } from "@/lib/assets";
import {
  NETWORKS,
  RECENT_WALLETS,
  SEND_ASSETS,
  shortenAddress,
  type WalletContact,
} from "@/lib/transfer";

export type WalletForm = {
  address: string;
  asset: string;
  network: string;
  memo: string;
  /** Set when the address arrived from the clipboard, which the design calls out. */
  pasted: boolean;
};

export const EMPTY_WALLET_FORM: WalletForm = {
  address: "",
  asset: SEND_ASSETS[0],
  network: NETWORKS[0],
  memo: "",
  pasted: false,
};

const ASSET_OPTIONS = SEND_ASSETS.map((symbol) => ({
  value: symbol,
  label: symbol,
  icon: getAssetLogo(symbol),
}));

const NETWORK_OPTIONS = NETWORKS.map((network) => ({
  value: network,
  label: network,
  icon: getAssetLogo(network),
}));

/** Address entry; the asset, network and memo appear once there is an address. */
export function WalletAddressForm({
  form,
  onChange,
  onPickRecent,
  onProceed,
}: {
  form: WalletForm;
  onChange: (next: WalletForm) => void;
  onPickRecent: (contact: WalletContact) => void;
  onProceed: () => void;
}) {
  const set = (patch: Partial<WalletForm>) => onChange({ ...form, ...patch });
  const filled = form.address.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-5 pt-6">
      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <FieldLabel>{filled ? "Enter wallet address" : "To:"}</FieldLabel>
          {form.pasted ? (
            <span className="text-[10px] leading-4 font-medium text-jumpa-primary-600">
              Pasted from clipboard
            </span>
          ) : null}
        </span>

        <span className={FIELD_SHELL}>
          {filled ? null : (
            <SearchAltIcon
              aria-hidden="true"
              className="size-6 shrink-0 text-jumpa-primary-600"
            />
          )}
          <input
            value={form.address}
            onChange={(event) =>
              set({ address: event.target.value, pasted: false })
            }
            placeholder="Enter wallet address"
            autoComplete="off"
            spellCheck={false}
            className={FIELD_INPUT}
          />
          {filled ? null : (
            <PasteAction
              onPaste={(text) => set({ address: text.trim(), pasted: true })}
            />
          )}
        </span>
      </label>

      {filled ? (
        <>
          <SelectField
            label="Asset to send"
            value={form.asset}
            options={ASSET_OPTIONS}
            onChange={(asset) => set({ asset })}
          />

          <SelectField
            label="Network"
            icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
            value={form.network}
            options={NETWORK_OPTIONS}
            onChange={(network) => set({ network })}
          />

          <Field label="Tag/Memo (Note/Remark)">
            <input
              value={form.memo}
              onChange={(event) => set({ memo: event.target.value })}
              placeholder="Add a memo"
              className={FIELD_INPUT}
            />
          </Field>
        </>
      ) : (
        RECENT_WALLETS.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs leading-5 font-medium text-jumpa-black">
              Recent accounts
            </h2>
            <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
              {RECENT_WALLETS.map((contact) => (
                <li key={contact.id}>
                  <OptionRow
                    media={
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-100 text-sm font-semibold text-jumpa-primary-600">
                        {contact.handle.charAt(0).toUpperCase()}
                      </span>
                    }
                    title={contact.handle}
                    caption={`${contact.network}, ${shortenAddress(contact.address)}`}
                    onClick={() => onPickRecent(contact)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <Button
        variant="gradient"
        size="lg"
        className="mt-auto"
        disabled={!filled}
        onClick={onProceed}
      >
        Proceed
      </Button>
    </div>
  );
}

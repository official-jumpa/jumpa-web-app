"use client";

import { useRef, useState } from "react";
import {
  FIELD_INPUT,
  Field,
  FieldLabel,
  fieldShell,
  PasteAction,
  ScanAction,
  SelectField,
} from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { getAssetLogo } from "@/lib/assets";
import {
  NETWORKS,
  NETWORK_CONFIGS,
  shortenAddress,
  type WalletContact,
} from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";

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
  asset: NETWORK_CONFIGS[NETWORKS[0]]?.assets[0] || "XLM",
  network: NETWORKS[0],
  memo: "",
  pasted: false,
};

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
  recentWallets = [],
  isLoadingRecents = false,
}: {
  form: WalletForm;
  onChange: (next: WalletForm) => void;
  onPickRecent: (contact: WalletContact) => void;
  onProceed: () => void;
  recentWallets?: WalletContact[];
  isLoadingRecents?: boolean;
}) {
  const [error, setError] = useState<string>();
  const fields = useRef<HTMLDivElement>(null);

  const currentConfig =
    NETWORK_CONFIGS[form.network] || NETWORK_CONFIGS["Stellar Mainnet"];

  const assetOptions = currentConfig.assets.map((symbol) => ({
    value: symbol,
    label: symbol,
    icon: getAssetLogo(symbol),
  }));

  const set = (patch: Partial<WalletForm>) => {
    if (patch.address !== undefined) setError(undefined);
    onChange({ ...form, ...patch });
  };

  const detectNetworkFromAddress = (rawAddress: string): { network: string; asset: string } | null => {
    const trimmed = rawAddress.trim();
    if (!trimmed) return null;

    // Tron: Starts with T, exactly 34 Base58 characters
    if (/^T[1-9A-HJ-NP-za-km-z]{33}$/.test(trimmed)) {
      return { network: "Tron", asset: "USDT" };
    }

    // Stellar: Starts with G, exactly 56 uppercase alphanumeric characters
    if (/^G[A-Z2-7]{55}$/.test(trimmed)) {
      return { network: "Stellar Mainnet", asset: "XLM" };
    }

    // EVM (Ethereum / Base): 0x followed by 40 hex chars
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      // Keep current network if it's already an EVM chain, otherwise default to Base
      if (form.network === "Ethereum") {
        return { network: "Ethereum", asset: "USDC" };
      }
      return { network: "Base", asset: "USDC" };
    }

    // Solana: Base58 string between 32 and 44 characters (excluding Stellar/Tron prefixes)
    if (/^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(trimmed) && !trimmed.startsWith("T") && !trimmed.startsWith("G")) {
      return { network: "Solana", asset: "SOL" };
    }

    return null;
  };

  const handleAddressChange = (newAddress: string, pasted = false) => {
    const detected = detectNetworkFromAddress(newAddress);
    if (detected) {
      set({ address: newAddress, pasted, network: detected.network, asset: detected.asset });
    } else {
      set({ address: newAddress, pasted });
    }
  };

  const handleNetworkChange = (network: string) => {
    const nextConfig = NETWORK_CONFIGS[network];
    const validAssets = nextConfig ? nextConfig.assets : [];
    const nextAsset = validAssets.includes(form.asset as any)
      ? form.asset
      : validAssets[0] || "XLM";
    set({ network, asset: nextAsset });
  };

  const filled = form.address.length > 0;

  const submit = () => {
    const address = form.address.trim();
    if (!address) {
      setError("Enter the wallet address you are sending to.");
      revealFirstError(fields.current);
      return;
    }
    if (/\s/.test(address)) {
      setError("A wallet address cannot contain spaces.");
      revealFirstError(fields.current);
      return;
    }

    const chain = currentConfig.chain;
    if (chain === "stellar") {
      if (!address.startsWith("G") || address.length !== 56) {
        setError("Invalid Stellar address");
        revealFirstError(fields.current);
        return;
      }
    } else if (chain === "solana") {
      if (address.length < 32 || address.length > 44) {
        setError("Invalid Solana address");
        revealFirstError(fields.current);
        return;
      }
    } else if (chain === "tron") {
      if (!address.startsWith("T") || address.length !== 34) {
        setError("Invalid Tron address");
        revealFirstError(fields.current);
        return;
      }
    } else if (chain === "base" || chain === "eth") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setError("Invalid EVM address");
        revealFirstError(fields.current);
        return;
      }
    }

    setError(undefined);
    onProceed();
  };

  return (
    <div ref={fields} className="flex flex-1 flex-col gap-5 pt-6">
      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <FieldLabel>{filled ? "Enter wallet address" : "To:"}</FieldLabel>
          {form.pasted ? (
            <span className="text-[10px] leading-4 font-medium text-jumpa-primary-600">
              Pasted from clipboard
            </span>
          ) : null}
        </span>

        <span className={fieldShell(Boolean(error))}>
          {filled ? null : (
            <SearchAltIcon
              aria-hidden="true"
              className="size-6 shrink-0 text-jumpa-primary-600"
            />
          )}
          <input
            value={form.address}
            onChange={(event) =>
              handleAddressChange(event.target.value, false)
            }
            placeholder="Enter wallet address"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            className={FIELD_INPUT}
          />
          {filled ? null : (
            <>
              <ScanAction />
              <PasteAction
                onPaste={(text) => handleAddressChange(text.trim(), true)}
              />
            </>
          )}
        </span>
        <FieldError>{error}</FieldError>
      </label>

      {filled ? (
        <>
          <SelectField
            label="Network"
            icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
            value={form.network}
            options={NETWORK_OPTIONS}
            onChange={handleNetworkChange}
          />

          <SelectField
            label="Asset to send"
            value={form.asset}
            options={assetOptions}
            onChange={(asset) => set({ asset })}
          />

          {currentConfig.supportsMemo ? (
            <Field label="Tag/Memo (Required for exchanges, optional for personal)">
              <input
                value={form.memo}
                onChange={(event) => set({ memo: event.target.value })}
                placeholder="Add a memo"
                className={FIELD_INPUT}
              />
            </Field>
          ) : null}
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs leading-5 font-medium text-jumpa-black">
            Recent accounts
          </h2>
          {isLoadingRecents ? (
            <div className="flex flex-col gap-3 rounded-surface bg-jumpa-primary-50 px-4 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-jumpa-primary-200" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-4 w-28 rounded bg-jumpa-primary-200" />
                  <div className="h-3 w-40 rounded bg-jumpa-primary-200" />
                </div>
              </div>
            </div>
          ) : recentWallets.length > 0 ? (
            <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
              {recentWallets.slice(0, 5).map((contact) => (
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
          ) : (
            // Same card as the list, so the slot doesn't change shape when a
            // first transaction fills it.
            <div className="flex flex-col items-center gap-3 rounded-surface bg-jumpa-primary-50 px-4 py-10">
              <span className="flex size-16 items-center justify-center rounded-full bg-jumpa-primary-950 text-jumpa-white">
                <CircleInformationIcon className="size-7" />
              </span>
              <span className="flex flex-col items-center gap-1 text-center">
                <span className="text-base leading-5 font-bold text-jumpa-black">
                  No recent accounts
                </span>
              </span>
            </div>
          )}
        </section>
      )}

      <Button variant="gradient" size="lg" className="mt-auto" onClick={submit}>
        Proceed
      </Button>
    </div>
  );
}

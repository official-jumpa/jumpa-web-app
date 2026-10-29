import Image from "next/image";
import { useState } from "react";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { ASSET_GROUPS, JUMPA_SEND_ASSETS, type SendAsset } from "@/lib/jumpa-send";

type Kind = SendAsset["kind"];

const TABS: Kind[] = ASSET_GROUPS.map((g) => g.kind);

/** Row gaps per list: the frame draws 11 under fiat and 10 under crypto. */
const GAP = { fiat: "gap-2.75", crypto: "gap-2.5" } as const;

/** Pick what to send in: fiat settles as USDC, crypto moves as itself. */
export function AssetSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: SendAsset;
  onSelect: (asset: SendAsset) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Kind>(selected.kind);

  return (
    <SheetPortal onClose={onClose}>
      <div className="sticky top-8.5 z-10 -mx-4.5 bg-jumpa-white px-4.5 pb-1">
        <div className="flex h-7.5 items-center justify-between">
          <h2 className="text-lg leading-4.5 font-semibold text-jumpa-black">Select Asset</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap flex size-7.5 items-center justify-center rounded-pill border border-jumpa-neutral-50 bg-jumpa-primary-100 text-jumpa-black active:scale-95"
          >
            <XmarkIcon className="size-4" />
          </button>
        </div>

        <div role="tablist" className="mt-4.5 grid grid-cols-2">
          {ASSET_GROUPS.map((group) => (
            <button
              key={group.kind}
              type="button"
              role="tab"
              id={`asset-tab-${group.kind}`}
              onClick={() => setTab(group.kind)}
              aria-selected={tab === group.kind}
              className={`text-sm leading-4.5 font-semibold transition-colors ${
                tab === group.kind ? "text-jumpa-primary-600" : "text-jumpa-grey-450"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="mt-1.75 h-0.5 overflow-clip rounded-[5px] bg-jumpa-neutral-250">
          <span
            aria-hidden="true"
            className="block h-full w-1/2 bg-jumpa-primary-600 transition-transform duration-300 ease-jumpa"
            style={{ transform: `translateX(${TABS.indexOf(tab) * 100}%)` }}
          />
        </div>
      </div>

      <ul
        role="tabpanel"
        aria-labelledby={`asset-tab-${tab}`}
        className={`mt-4 flex flex-col ${GAP[tab]}`}
      >
        {JUMPA_SEND_ASSETS.filter((a) => a.kind === tab).map((asset) => (
          <li key={asset.code}>
            <AssetRow
              asset={asset}
              picked={asset.code === selected.code}
              onPick={() => onSelect(asset)}
            />
          </li>
        ))}
      </ul>
    </SheetPortal>
  );
}

function AssetRow({
  asset,
  picked,
  onPick,
}: {
  asset: SendAsset;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`tap flex h-14 w-full items-center gap-5 rounded-tile border border-jumpa-primary-50 pr-4 pl-4.25 text-left active:scale-[0.99] ${
        picked ? "bg-jumpa-surface" : "bg-jumpa-neutral-50"
      }`}
    >
      <Image
        src={asset.icon}
        alt=""
        width={31}
        height={31}
        className="size-7.75 shrink-0 rounded-full object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col text-jumpa-slate-600">
        <span className="text-sm leading-4.25 font-semibold">{asset.code}</span>
        <span className="truncate text-xs leading-4.25">{asset.name}</span>
      </span>
      {picked ? (
        <Image src="/images/send/radio-on.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
      ) : (
        <span aria-hidden="true" className="size-5 shrink-0 rounded-pill border border-jumpa-neutral-250" />
      )}
    </button>
  );
}

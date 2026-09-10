import Image from "next/image";
import { getAssetLogo } from "@/lib/assets";
import type { Asset } from "@/lib/wallet";

const ROW = "tap flex w-full items-center gap-2 text-left active:scale-[0.99]";

/** One wallet in the picker: brand mark, ticker and what it holds. */
export function AssetRow({
  asset,
  value,
  onSelect,
}: {
  asset: Asset;
  /** USD worth of the holding. The deposit list draws none. */
  value?: string;
  /** The row asks for a network rather than navigating, so it is a button. */
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className={ROW}>
      {/* Resolved from the symbol so the glyph can never disagree with it. */}
      <Image
        src={getAssetLogo(asset.symbol)}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-contain"
      />
      <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
        {asset.symbol}
      </span>
      {value ? (
        <span className="ml-auto shrink-0 text-sm leading-5.5 font-semibold text-jumpa-black">
          {value}
        </span>
      ) : null}
    </button>
  );
}

/** Figma draws these as zero-height lines, so the height has to come back out. */
export function AssetRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

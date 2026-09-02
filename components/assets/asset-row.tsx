import Image from "next/image";
import Link from "next/link";
import { getAssetLogo } from "@/lib/assets";
import type { Asset } from "@/lib/wallet";

const ROW = "tap flex w-full items-center gap-2 text-left active:scale-[0.99]";

/** One wallet in the picker: brand mark and ticker. */
export function AssetRow({
  asset,
  onSelect,
}: {
  asset: Asset;
  /** Set on Receive, where the row raises the network sheet instead of navigating. */
  onSelect?: () => void;
}) {
  const body = (
    <>
      {/* Resolved from the symbol so the glyph can never disagree with it. */}
      <Image
        src={getAssetLogo(asset.symbol)}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-contain"
      />
      <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
        {asset.label ?? asset.symbol}
      </span>
    </>
  );

  return onSelect ? (
    <button type="button" onClick={onSelect} className={ROW}>
      {body}
    </button>
  ) : (
    <Link href={`/assets/${asset.symbol.toLowerCase()}`} className={ROW}>
      {body}
    </Link>
  );
}

/** Figma draws these as zero-height lines, so the height has to come back out. */
export function AssetRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

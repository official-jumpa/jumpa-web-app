import Image from "next/image";
import Link from "next/link";
import { getAssetLogo } from "@/lib/assets";
import type { Asset } from "@/lib/wallet";

/** One wallet in the picker: glyph, symbol and name, balance and change. */
export function AssetRow({ asset }: { asset: Asset }) {
  return (
    <Link
      href={`/assets/${asset.symbol.toLowerCase()}`}
      className="tap flex items-center gap-3 rounded-surface bg-jumpa-neutral-50 px-4 py-3.5 active:scale-[0.99]"
    >
      {/* Resolved from the symbol so the glyph can never disagree with it. */}
      <Image
        src={getAssetLogo(asset.symbol)}
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full object-contain"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-4.5 font-semibold text-jumpa-black">
          {asset.symbol}
        </span>
        <span className="truncate text-[10px] leading-3 text-jumpa-neutral-350">
          {asset.name}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-sm leading-4.5 font-semibold text-jumpa-black">
          {asset.balance}
        </span>
        <span className="text-[10px] leading-3 font-medium text-jumpa-success">
          {asset.change}
        </span>
      </span>
    </Link>
  );
}

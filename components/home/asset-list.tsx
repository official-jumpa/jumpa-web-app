import Image from "next/image";
import Link from "next/link";
import { getAssetLogo } from "@/lib/assets";
import type { Asset } from "@/lib/wallet";
import { HomeSection } from "./home-section";

/** Horizontally scrolling row of balances, one card per wallet. */
export function AssetList({ assets }: { assets: Asset[] }) {
  return (
    <HomeSection
      title="Your Wallets"
      action={
        <Link href="/assets" className="text-xs text-jumpa-primary-950">
          See All
        </Link>
      }
    >
      <ul className="-mx-4.5 flex snap-x scroll-pl-4.5 gap-2 overflow-x-auto px-4.5 [scrollbar-width:none]">
        {assets.map((asset, index) => (
          <li
            // Placeholder data repeats the same asset, so the index is the key.
            key={`${asset.symbol}-${index}`}
            className="shrink-0 snap-start"
          >
            <Link
              href={`/assets?token=${asset.symbol.toLowerCase()}`}
              className="tap flex h-27 w-38.75 flex-col justify-between rounded-panel bg-jumpa-neutral-50 px-4 py-3.5 active:scale-[0.98]"
            >
              <span className="flex items-center gap-1">
                {/* Resolved from the symbol so the glyph can never disagree with it. */}
                <Image
                  src={getAssetLogo(asset.symbol)}
                  alt=""
                  width={22}
                  height={22}
                  className="size-5.5 rounded-full object-contain"
                />
                <span className="flex flex-col">
                  <span className="text-[10px] leading-3 font-medium text-jumpa-black">
                    {asset.symbol}
                  </span>
                  <span className="text-[8px] leading-2 text-jumpa-neutral-350">
                    {asset.name}
                  </span>
                </span>
              </span>

              <span className="flex flex-col gap-0.5 font-medium">
                <span className="text-base leading-5 text-jumpa-black">
                  {asset.balance}
                </span>
                <span className="text-[10px] leading-3 text-jumpa-success">
                  {asset.change}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

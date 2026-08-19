import Image from "next/image";
import type { Asset } from "@/lib/wallet";
import { HomeSection } from "./home-section";

/** Horizontally scrolling row of balances, one card per asset. */
export function AssetList({ assets }: { assets: Asset[] }) {
  return (
    <HomeSection title="Your Assets">
      <ul className="-mx-4.5 flex snap-x scroll-pl-4.5 gap-2 overflow-x-auto px-4.5 [scrollbar-width:none]">
        {assets.map((asset, index) => (
          <li
            // Placeholder data repeats the same asset, so the index is the key.
            key={`${asset.symbol}-${index}`}
            className="flex w-38.75 shrink-0 snap-start flex-col gap-6 rounded-panel bg-jumpa-neutral-50 py-3.5 pr-7 pl-4"
          >
            <div className="flex items-center gap-1">
              <Image
                src={asset.icon}
                alt=""
                width={22}
                height={22}
                className="size-5.5"
              />
              <span className="flex flex-col">
                <span className="text-[10px] leading-3 font-medium text-jumpa-black">
                  {asset.symbol}
                </span>
                <span className="text-[8px] leading-2 text-jumpa-neutral-350">
                  {asset.name}
                </span>
              </span>
            </div>

            <p className="flex flex-col gap-0.5 font-medium">
              <span className="text-base leading-5 text-jumpa-black">
                {asset.balance}
              </span>
              <span className="text-[10px] leading-3 text-jumpa-success">
                {asset.change}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

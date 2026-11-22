import Image from "next/image";
import { formatRewardNaira } from "@/lib/referrals/rules";

/** Purple hero: what can be claimed now, the lifetime total, and how many joined. */
export function EarningsCard({
  available,
  total,
  invited,
}: {
  available: number;
  total: number;
  invited: number;
}) {
  return (
    <div className="relative isolate flex h-28.25 flex-col items-center justify-center overflow-hidden rounded-card bg-[image:var(--gradient-jumpa-hero)]">
      <Image
        src="/images/home/hero-grid.svg"
        alt=""
        width={287}
        height={264}
        className="pointer-events-none absolute -z-10 max-w-none opacity-40"
      />

      <span className="flex h-4.5 items-center rounded-pill bg-jumpa-primary-950 px-2.75 text-2xs leading-2.5 font-medium text-jumpa-white">
        Referral Earnings
      </span>
      <p className="mt-2 text-figure leading-6.5 font-bold text-jumpa-white">
        {formatRewardNaira(available)}
      </p>
      <p className="mt-1.5 text-2xs leading-3 text-jumpa-white/80">
        {formatRewardNaira(total)} earned in total
      </p>

      <span className="absolute top-3 right-2.5 flex h-8.5 items-center rounded-pill bg-jumpa-white/25 px-2.75 text-xs leading-3 font-medium text-jumpa-white">
        {invited} Invited
      </span>
    </div>
  );
}

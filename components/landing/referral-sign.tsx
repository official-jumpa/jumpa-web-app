import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { REFERRAL_SIGN } from "@/lib/landing";

/**
 * The hanging "Referral Challenge is live" sign, a 301×112 artboard scaled by
 * the caller's width. The design's white string is drawn purple to show on
 * the landing's white page.
 */
export function ReferralSign({ className }: { className?: string }) {
  const stringMask = useId();

  return (
    <div className={cn("frame-301 pointer-events-none", className)}>
      <div className="relative h-112 w-301">
        <svg
          aria-hidden="true"
          viewBox="0 0 301 112"
          fill="none"
          className="absolute inset-0 size-full"
        >
          <g transform="translate(56.225 1.96)">
            <mask id={stringMask} fill="white">
              <path d="M87.8406 1.70433C91.8296 -0.568111 96.7214 -0.56811 100.71 1.70433L181.964 47.9928C193.555 54.5961 188.869 72.2885 175.529 72.2885H13.0217C-0.318459 72.2885 -5.0044 54.5961 6.5868 47.9928L87.8406 1.70433Z" />
            </mask>
            <path
              d="M13.0217 72.2885H175.529C188.87 72.2885 193.555 54.5961 181.964 47.9928L100.71 1.70433C96.7214 -0.56811 91.8296 -0.568111 87.8406 1.70433L6.5868 47.9928C-5.0044 54.5961 -0.318459 72.2885 13.0217 72.2885Z"
              strokeWidth="4"
              mask={`url(#${stringMask})`}
              className="stroke-jumpa-primary-600"
            />
          </g>
          <circle
            cx="150.5"
            cy="13.5"
            r="5.5"
            strokeWidth="4"
            className="fill-jumpa-white stroke-jumpa-primary-600"
          />
        </svg>

        <Link
          href={REFERRAL_SIGN.href}
          className="tap pointer-events-auto absolute top-46 left-17 flex h-66 w-274 items-center overflow-hidden whitespace-nowrap rounded-u-10 bg-jumpa-primary-600 pl-14 font-medium text-jumpa-white text-u-17.5/22 -tracking-u-0.75 active:scale-[0.98]"
        >
          {REFERRAL_SIGN.lead}&nbsp;
          <span className="font-bold text-jumpa-alt-400">
            {REFERRAL_SIGN.highlight}
          </span>
        </Link>
      </div>
    </div>
  );
}

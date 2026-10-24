import Link from "next/link";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";
import { RefreshIcon } from "@/components/ui/icons/refresh";

/** Nudge to finish identity verification. Hidden once every step is done. */
export function KycCard({ isPending }: { isPending?: boolean }) {
  return (
    <Link
      prefetch
      href="/kyc"
      className="flex h-20 items-center gap-4.5 rounded-xl border-[1.5px] border-jumpa-primary-50 bg-jumpa-neutral-50 pr-4 pl-3.25 transition-all hover:bg-jumpa-primary-50/20 active:scale-[0.99]"
    >
      <span className="flex items-center gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-600 text-jumpa-alt-400">
          {isPending ? (
            <RefreshIcon className="size-5 animate-spin text-jumpa-white" />
          ) : (
            <UserAlt1Icon className="size-6" />
          )}
        </span>

        <span className="flex flex-col gap-1">
          <span className="text-xs leading-4 font-semibold text-jumpa-primary-950 flex items-center gap-1.5">
            <span>{isPending ? "Verification in progress" : "Complete your KYC"}</span>
            {isPending && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-jumpa-primary-600 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-jumpa-primary-600" />
              </span>
            )}
          </span>
          <span className="text-[10px] leading-3.25 font-medium text-jumpa-neutral-400">
            {isPending
              ? "Your details are being verified. Tap to check status"
              : "Verify your identity to unlock all features and keep your account secure"}
          </span>
        </span>
      </span>

      <CornerUpRightIcon className="size-6 shrink-0 text-jumpa-primary-950" />
    </Link>
  );
}

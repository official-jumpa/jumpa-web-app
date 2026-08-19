import Link from "next/link";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";

/** Nudge to finish identity verification. Hidden once every step is done. */
export function KycCard({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  if (completed >= total) return null;

  return (
    <Link
      href="/kyc"
      className="flex h-20 items-center gap-4.5 rounded-xl border-[1.5px] border-jumpa-primary-50 bg-jumpa-white pr-4 pl-3.25"
    >
      <span className="flex items-center gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-600 text-jumpa-alt-400">
          <UserAlt1Icon className="size-6" />
        </span>

        <span className="flex flex-col gap-1">
          <span className="text-xs leading-4 font-semibold text-jumpa-primary-950">
            Complete your KYC ({completed}/{total})
          </span>
          <span className="text-[10px] leading-3.25 font-medium text-jumpa-neutral-300">
            Verify your identity to unlock all features and keep your account
            secure.
          </span>
        </span>
      </span>

      <CornerUpRightIcon className="size-6 shrink-0 text-jumpa-primary-950" />
    </Link>
  );
}

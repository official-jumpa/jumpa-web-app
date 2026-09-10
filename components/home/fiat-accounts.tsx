import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FIAT_ACCOUNTS, type FiatAccount } from "@/lib/wallet";
import { FiatBalance } from "./fiat-balance";

/** USD has its own opening flow; NGN still starts with identity. */
const CREATE: Record<FiatAccount["id"], string> = {
  ngn: "/kyc",
  usd: "/usd-account",
};

/** A funded account opens the details money is sent to. */
const DETAILS: Record<FiatAccount["id"], string> = {
  ngn: "/receive?rail=fiat",
  usd: "/usd-account?view=details",
};

/** The NGN and USD balances, side by side under the quick actions. */
export function FiatAccounts() {
  return (
    <ul className="flex items-stretch gap-2">
      {FIAT_ACCOUNTS.map((account) => (
        <li key={account.id} className="flex flex-1">
          <AccountCard account={account} />
        </li>
      ))}
    </ul>
  );
}

function AccountCard({ account }: { account: FiatAccount }) {
  return (
    <div className="relative flex flex-1 flex-col gap-4 rounded-panel bg-jumpa-neutral-50 px-4 py-2.5">
      <span className="flex items-center gap-1">
        <Image
          src={account.flag}
          alt=""
          width={64}
          height={64}
          className="size-4 rounded-full object-contain"
        />
        <span className="text-[10px] font-medium text-jumpa-black">
          {account.label}
        </span>
      </span>

      {account.balance ? (
        <>
          <span className="flex flex-col">
            <span className="text-[8px] leading-2.5 font-medium text-jumpa-neutral-425">
              Available
            </span>
            <FiatBalance amount={account.balance} label={account.label} />
          </span>

          {/* Full height, so the design's 20px glyph still takes a real tap. */}
          <Link
            href={DETAILS[account.id]}
            aria-label={`Open your ${account.label}`}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-end pr-2.375 text-jumpa-black"
          >
            <ChevronRightIcon className="size-5" />
          </Link>
        </>
      ) : (
        <Link
          href={CREATE[account.id]}
          className="tap flex h-8.25 items-center justify-center rounded-pill bg-jumpa-white text-[10px] font-medium text-jumpa-primary-600 active:scale-95"
        >
          Create Account
        </Link>
      )}
    </div>
  );
}

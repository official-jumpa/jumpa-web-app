import { cn } from "@/lib/cn";
import type {
  ReferralHistoryItem,
  ReferralProgress,
} from "@/lib/referrals/overview";
import { formatRewardNaira } from "@/lib/referrals/rules";

const STATUS: Record<
  ReferralProgress,
  { label: string; pill: string; hint: string | null }
> = {
  rewarded: {
    label: "Rewarded",
    pill: "bg-jumpa-success-50 text-jumpa-success-700",
    hint: null,
  },
  kyc_verified: {
    label: "Verified",
    pill: "bg-jumpa-primary-50 text-jumpa-primary-600",
    hint: "Waiting for their first $10 trade",
  },
  joined: {
    label: "Joined",
    pill: "bg-jumpa-neutral-100 text-jumpa-neutral-500",
    hint: "Waiting for identity check",
  },
  not_eligible: {
    label: "Not eligible",
    pill: "bg-jumpa-neutral-100 text-jumpa-neutral-400",
    hint: "Joined outside the campaign",
  },
};

function joinedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Everyone who joined with the user's code, newest first, and where each one is. */
export function ReferralHistory({
  items,
  invited,
}: {
  items: ReferralHistoryItem[];
  invited: number;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm leading-4 font-medium text-jumpa-black">
          Referral History
        </h2>
        <span className="text-xs leading-3.5 text-jumpa-neutral-350">
          {invited} Invited
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex h-25 flex-col items-center justify-center rounded-card bg-jumpa-neutral-50 px-4 text-center">
          <p className="text-xs font-medium text-jumpa-neutral-350">
            No referrals yet. Share your referral link with friends to earn
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const status = STATUS[item.status];
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-3.5 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-xs font-semibold text-jumpa-black">
                    {item.name}
                  </span>
                  <span className="truncate text-2xs text-jumpa-neutral-350">
                    Joined {joinedOn(item.joinedAt)}
                    {status.hint ? ` · ${status.hint}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-pill px-2 py-0.5 text-2xs font-semibold",
                      status.pill,
                    )}
                  >
                    {status.label}
                  </span>
                  {item.reward !== null ? (
                    <span className="rounded-pill bg-jumpa-primary-100 px-2 py-0.5 text-xs font-bold text-jumpa-primary-600">
                      +{formatRewardNaira(item.reward)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

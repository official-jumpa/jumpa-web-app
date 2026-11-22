import Link from "next/link";
import {
  InitialsAvatar,
  toneForRank,
} from "@/components/referral-leaderboard/initials-avatar";
import { ArrowRightIcon } from "@/components/ui/icons/arrow-right";
import { REFERRAL_CHALLENGE } from "@/lib/landing";
import type { LeaderboardEntry } from "@/lib/referrals/leaderboard";
import { formatRewardNaira } from "@/lib/referrals/rules";

const HEAD =
  "font-semibold text-jumpa-ink-muted uppercase text-u-10/14 tracking-u-0.5 md:text-u-12/16 md:tracking-u-1";
const NUMBER =
  "text-center font-semibold text-jumpa-ink tabular-nums text-u-14/20 md:text-u-17/24";

/** Ranks below the podium, with a footer that toggles the full board. */
export function LeaderboardTable({
  rows,
  footer,
}: {
  rows: LeaderboardEntry[];
  footer: { text: string; link: { href: string; label: string } | null };
}) {
  const { columns } = REFERRAL_CHALLENGE.board;
  return (
    <div className="mt-28 w-362 overflow-clip rounded-u-18 bg-jumpa-white md:mt-60 md:w-1200 md:rounded-u-22">
      <table className="w-full table-fixed border-collapse">
        <thead className="bg-jumpa-surface">
          <tr className="h-44 md:h-62">
            <th
              scope="col"
              className={`${HEAD} w-52 pl-16 text-left md:w-195 md:pl-40`}
            >
              {columns.rank}
            </th>
            <th scope="col" className={`${HEAD} text-left`}>
              {columns.name}
            </th>
            <th
              scope="col"
              className={`${HEAD} hidden text-center md:table-cell md:w-270`}
            >
              {columns.invited}
            </th>
            <th scope="col" className={`${HEAD} w-76 text-center md:w-270`}>
              {columns.referrals}
            </th>
            <th
              scope="col"
              className={`${HEAD} w-92 pr-16 text-right md:w-236 md:pr-40`}
            >
              {columns.earned}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.rank}
              className="h-56 border-jumpa-lavender-150 border-t md:h-72"
            >
              <td className="pl-16 md:pl-40">
                <span className="flex size-30 items-center justify-center rounded-full border-u-1 border-jumpa-lavender-200 font-semibold text-jumpa-ink text-u-12/16 md:size-41 md:text-u-15/20">
                  {row.rank}
                </span>
              </td>
              <td>
                <span className="flex min-w-0 items-center gap-8 md:gap-12">
                  <InitialsAvatar
                    initials={row.initials}
                    tone={toneForRank(row.rank)}
                    className="size-30 text-u-11/14 md:size-38 md:text-u-13/16"
                  />
                  <span className="truncate font-semibold text-jumpa-ink text-u-14/20 md:text-u-17/24">
                    {row.name}
                  </span>
                </span>
              </td>
              <td className={`${NUMBER} hidden md:table-cell`}>
                {row.invited}
              </td>
              <td className={NUMBER}>{row.referrals}</td>
              <td className="pr-16 text-right font-bold text-jumpa-primary-600 tabular-nums text-u-14/20 md:pr-40 md:text-u-17/24">
                {formatRewardNaira(row.earned)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex min-h-60 items-center justify-between gap-12 border-jumpa-lavender-150 border-t px-16 py-12 md:h-84 md:px-40 md:py-0">
        <p className="text-jumpa-ink-muted text-u-12/16 md:text-u-15/20">
          {footer.text}
        </p>
        {footer.link && (
          <Link
            href={footer.link.href}
            className="tap inline-flex h-36 shrink-0 items-center gap-6 rounded-full border-u-1 border-jumpa-primary-600 px-14 font-semibold text-jumpa-primary-600 text-u-12/16 active:scale-[0.98] md:h-46 md:gap-10 md:px-20 md:text-u-15/20"
          >
            {footer.link.label}
            <ArrowRightIcon className="size-14 md:size-18" />
          </Link>
        )}
      </div>
    </div>
  );
}

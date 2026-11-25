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
  "px-4 font-bold text-jumpa-ink-muted uppercase text-u-10/16 md:px-0 md:text-u-12/18 md:tracking-u-1";
const NUMBER =
  "text-center font-semibold text-jumpa-ink tabular-nums text-u-15/22 md:font-bold md:text-u-18/24";

/** Ranks below the podium. Phones scroll the table sideways; the footer stays put. */
export function LeaderboardTable({
  rows,
  footer,
}: {
  rows: LeaderboardEntry[];
  footer: { text: string; link: { href: string; label: string } | null };
}) {
  const { columns } = REFERRAL_CHALLENGE.board;
  return (
    <div className="mt-30 ml-24 w-378 self-start overflow-clip rounded-u-20 bg-jumpa-white shadow-lift-u-10/30 shadow-jumpa-primary-600/8 md:mt-60 md:ml-0 md:w-1200 md:self-center md:rounded-u-32 md:shadow-lift-u-12/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-455 table-fixed border-collapse">
          <thead className="bg-jumpa-violet-25">
            <tr className="h-44 md:h-64">
              <th
                scope="col"
                className={`${HEAD} w-87 pl-16 text-left md:w-195 md:pl-40`}
              >
                {columns.rank}
              </th>
              <th scope="col" className={`${HEAD} w-84 text-left md:w-244`}>
                {columns.name}
              </th>
              <th scope="col" className={`${HEAD} w-87 text-center md:w-240`}>
                {columns.invited}
              </th>
              <th scope="col" className={`${HEAD} w-87 text-center md:w-300`}>
                {columns.referrals}
              </th>
              <th
                scope="col"
                className={`${HEAD} w-110 pr-37 text-right md:w-221 md:pr-40`}
              >
                {columns.earned}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rank}
                className="h-64 border-jumpa-primary-90 border-b md:h-72"
              >
                <td className="pl-16 md:pl-40">
                  <span className="flex size-32 items-center justify-center rounded-full bg-jumpa-primary-50 font-bold text-jumpa-primary-950 text-u-13/22 md:size-40 md:text-u-15/22">
                    {row.rank}
                  </span>
                </td>
                <td>
                  <span className="flex min-w-0 items-center md:gap-16">
                    <InitialsAvatar
                      initials={row.initials}
                      tone={toneForRank(row.rank)}
                      className="hidden size-40 font-bold text-u-14/22 md:flex"
                    />
                    <span className="truncate text-left font-bold text-jumpa-ink text-u-15/22 md:text-u-16/22">
                      {row.name}
                    </span>
                  </span>
                </td>
                <td className={NUMBER}>{row.invited}</td>
                <td className={NUMBER}>{row.referrals}</td>
                <td className="pr-37 text-right font-bold text-jumpa-primary-600 tabular-nums text-u-15/22 md:pr-40 md:text-u-18/24">
                  {formatRewardNaira(row.earned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones show only the button, so the footer goes when there is no link. */}
      <div
        className={`${footer.link ? "flex" : "hidden md:flex"} items-center p-16 md:h-84 md:justify-between md:px-40 md:py-0`}
      >
        <p className="hidden font-medium text-jumpa-ink-muted text-u-14/22 md:block">
          {footer.text}
        </p>
        {footer.link && (
          <Link
            href={footer.link.href}
            className="tap inline-flex h-48 w-322 shrink-0 items-center justify-center gap-8 rounded-full border-u-1.5 border-jumpa-primary-600 bg-jumpa-white font-semibold text-jumpa-primary-600 text-u-14/22 active:scale-[0.98] md:w-220"
          >
            {footer.link.label}
            <ArrowRightIcon className="size-16" />
          </Link>
        )}
      </div>
    </div>
  );
}

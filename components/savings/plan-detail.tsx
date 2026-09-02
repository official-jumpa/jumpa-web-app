import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/auth/copy-button";
import { PlanCard } from "@/components/savings/plan-card";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { CIRCLE_INVITE, type SavingsPlan } from "@/lib/savings";

const ACTION =
  "tap flex h-13 flex-1 items-center justify-center gap-2 rounded-tile bg-jumpa-neutral-50 " +
  "text-sm leading-4 font-medium text-jumpa-black active:scale-[0.98]";

/** One plan: its progress card, what you can do with it, and its terms. */
export function PlanDetail({
  plan,
  back,
  topUpHref,
}: {
  plan: SavingsPlan;
  back: string;
  topUpHref: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back={back} title={plan.name} />

      <div className="mt-4">
        <PlanCard plan={plan} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link href={topUpHref} className={ACTION}>
          <ArrowUpRightIcon className="size-5 text-jumpa-primary-600" />
          Top up
        </Link>
        <Link href="/savings/withdraw" className={ACTION}>
          <ArrowDownRightIcon className="size-5 text-jumpa-primary-600" />
          Withdraw
        </Link>
      </div>

      <div className="mt-5">
        <DetailList>
          <DetailRow label="Name" value={plan.name} />
          <DetailRow label="Start date" value={plan.startDate} />
          <DetailRow label="End date" value={plan.endDateLong} />
          <DetailRow label="Frequency" value={plan.frequency} rule={false} />
        </DetailList>
      </div>

      {plan.members ? (
        <section className="mt-5 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-jumpa-black">Members</h2>

          <ul className="flex flex-col gap-2">
            {plan.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-surface bg-jumpa-neutral-50 px-4 py-3.5"
              >
                <Image
                  src={member.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm leading-4.5 font-semibold text-jumpa-black">
                    {member.name}
                  </span>
                  <span className="truncate text-[10px] leading-3 text-jumpa-neutral-350">
                    {member.role}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[10px] leading-3 font-semibold ${
                    member.status === "Joined"
                      ? "text-jumpa-success"
                      : "text-jumpa-warning"
                  }`}
                >
                  {member.status}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-2 text-xs font-medium text-jumpa-black">
            Invite link
          </h2>
          <div className="flex items-center gap-3 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
            <span className="min-w-0 flex-1 truncate text-xs leading-4 font-medium text-jumpa-primary-950">
              {CIRCLE_INVITE}
            </span>
          </div>
          <CopyButton value={CIRCLE_INVITE} label="Copy to Clipboard" />
        </section>
      ) : null}
    </div>
  );
}

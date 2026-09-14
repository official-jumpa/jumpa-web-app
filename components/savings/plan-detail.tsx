import Image from "next/image";
import { CopyButton } from "@/components/auth/copy-button";
import { PlanAction, PlanActions } from "@/components/savings/plan-actions";
import { PlanCard } from "@/components/savings/plan-card";
import { WithdrawAction } from "@/components/savings/withdraw-action";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { CIRCLE_INVITE, type SavingsPlan } from "@/lib/savings";

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
  const withdrawHref = `/savings/withdraw?id=${plan.id}&name=${encodeURIComponent(plan.name)}&saved=${encodeURIComponent(plan.saved)}&kind=${plan.kind}&daysLeft=${plan.daysLeft}`;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back={back} title={plan.name} />

      <div className="mt-6 flex flex-col gap-6">
        <PlanCard plan={plan} />

        {plan.status === "Closed" ? (
          <div className="flex items-center justify-center rounded-tile bg-jumpa-neutral-50 py-3 text-xs font-medium text-jumpa-neutral-400">
            This savings plan has ended
          </div>
        ) : (
          <PlanActions>
            {/* A lock cannot be topped up; the frame draws the button regardless. */}
            {plan.kind !== "lock" ? (
              <PlanAction href={topUpHref} icon={ShieldCheckIcon}>
                Top up
              </PlanAction>
            ) : null}
            <WithdrawAction
              href={withdrawHref}
              warn={plan.status === "Active"}
            />
          </PlanActions>
        )}

        <DetailList>
          <DetailRow label="Name" value={plan.name} />
          <DetailRow label="Start date" value={plan.startDate} />
          <DetailRow
            label={plan.kind === "lock" ? "Maturity date" : "End date"}
            value={plan.endDateLong}
          />
          {plan.kind === "lock" ? (
            <DetailRow
              label="Lock status"
              value={
                plan.status === "Closed"
                  ? "Closed"
                  : plan.daysLeft > 0
                    ? `${plan.daysLeft} days until maturity`
                    : "Matured"
              }
              rule={false}
            />
          ) : (
            <DetailRow label="Frequency" value={plan.frequency} rule={false} />
          )}
        </DetailList>

        {plan.members ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-jumpa-black">Members</h2>

            <ul className="flex flex-col gap-6 rounded-surface bg-jumpa-primary-50 p-4">
              {plan.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-jumpa-white">
                      <Image
                        src={member.avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 object-cover"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-jumpa-black">
                        {member.name}
                      </span>
                      <span className="truncate text-xs leading-3 font-bold text-jumpa-neutral-400">
                        {member.role}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-jumpa-black">
                    {member.status}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-3 flex w-48.75 flex-col items-center gap-3 text-center">
              <div className="flex flex-col gap-1.75">
                <h2 className="text-sm font-bold text-jumpa-black">
                  Invite link
                </h2>
                <p className="text-sm font-semibold text-jumpa-black">
                  {CIRCLE_INVITE}
                </p>
              </div>
              <CopyButton
                value={CIRCLE_INVITE}
                label="Copy to Clipboard"
                className="w-full"
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

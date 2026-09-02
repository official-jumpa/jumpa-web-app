import Image from "next/image";
import Link from "next/link";
import type { SavingsPlan } from "@/lib/savings";

/** Summary of one plan: what it is for, how far along it is, and by when. */
export function PlanCard({ plan, href }: { plan: SavingsPlan; href?: string }) {
  const body = (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-1">
          <h3 className="flex-1 text-lg font-semibold text-jumpa-black">
            {plan.name}
          </h3>
          {plan.members ? (
            <Members members={plan.members} />
          ) : (
            <span className="flex h-5.75 items-center justify-center rounded-pill border border-jumpa-white/43 bg-jumpa-primary-300 px-2.5 text-[8px] leading-3 font-medium text-jumpa-white">
              Rate% p.a.
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="flex-1 text-[10px] leading-3.5 text-jumpa-grey-600">
            End date - <span className="font-bold">{plan.endDate}</span>
          </p>
          {plan.members ? (
            <span className="text-[10px] leading-3 font-semibold text-jumpa-success">
              {plan.members.length + 2} members
            </span>
          ) : (
            <span className="text-[10px] leading-3 font-semibold text-jumpa-success">
              {plan.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] leading-5 font-medium text-jumpa-black">
          Saved{" "}
          <span className="font-bold text-jumpa-primary-500">{plan.saved}</span>
          {" / "}
          <span className="font-bold text-jumpa-primary-500">
            {plan.target}
          </span>{" "}
          target
        </p>
        <div className="h-1 w-full overflow-hidden bg-jumpa-primary-200">
          <div
            className="h-full bg-jumpa-primary-400"
            style={{ width: `${plan.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] leading-2.5 font-semibold text-jumpa-secondary-950">
          <span>{plan.daysLeft} days left</span>
          <span>{plan.percent}%</span>
        </div>
      </div>
    </>
  );

  const shell =
    "flex flex-col gap-6 rounded-surface border border-jumpa-primary-300 bg-jumpa-secondary-50 p-4";

  return href ? (
    <Link href={href} className={`tap ${shell} active:scale-[0.99]`}>
      {body}
    </Link>
  ) : (
    <article className={shell}>{body}</article>
  );
}

/** Stacked member avatars with the overflow count, as a circle card shows them. */
function Members({ members }: { members: SavingsPlan["members"] }) {
  if (!members) return null;

  return (
    <span className="flex shrink-0 items-center">
      {members.slice(0, 2).map((member, index) => (
        <Image
          key={member.id}
          src={member.avatar}
          alt=""
          width={24}
          height={24}
          className={`size-6 rounded-full object-cover ring-2 ring-jumpa-secondary-50 ${
            index > 0 ? "-ml-2" : ""
          }`}
        />
      ))}
      <span className="-ml-2 flex size-6 items-center justify-center rounded-full bg-jumpa-primary-950 text-[8px] font-semibold text-jumpa-white ring-2 ring-jumpa-secondary-50">
        +{members.length}
      </span>
    </span>
  );
}

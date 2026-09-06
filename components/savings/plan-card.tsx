import Image from "next/image";
import Link from "next/link";
import type { SavingsPlan } from "@/lib/savings";

const STATUS_COLORS: Record<string, string> = {
  Active: "text-jumpa-success",
  Matured: "text-jumpa-primary-600",
  Closed: "text-jumpa-neutral-400",
};

/** Summary of one plan: what it is for, how far along it is, and by when. */
export function PlanCard({ plan, href }: { plan: SavingsPlan; href?: string }) {
  const isClosed = plan.status === "Closed";
  const isMatured = plan.status === "Matured" || plan.daysLeft === 0;
  const timeLabel = isClosed ? "Closed" : isMatured ? "Matured" : `${plan.daysLeft} days left`;

  const body = (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-1">
          <h3 className={`flex-1 text-lg font-semibold ${isClosed ? "text-jumpa-neutral-600" : "text-jumpa-black"}`}>
            {plan.name}
          </h3>
          {plan.members ? (
            <Members members={plan.members} />
          ) : (
            <span
              className={`flex h-5.75 items-center justify-center rounded-pill border px-2.5 text-[8px] leading-3 font-medium ${
                isClosed
                  ? "border-jumpa-neutral-200 bg-jumpa-neutral-300 text-jumpa-neutral-600"
                  : "border-jumpa-white/43 bg-jumpa-primary-300 text-jumpa-white"
              }`}
            >
              {plan.kind === "lock" ? "Locked" : "Target"}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="flex-1 text-[10px] leading-3.5 text-jumpa-grey-600">
            {plan.kind === "lock" ? "Maturity date - " : "End date - "}
            <span className="font-bold">{plan.endDate}</span>
          </p>
          {plan.members ? (
            <span className="text-[10px] leading-3 font-semibold text-jumpa-success">
              {plan.members.length + 2} members
            </span>
          ) : (
            <span className={`text-[10px] leading-3 font-semibold ${STATUS_COLORS[plan.status] || "text-jumpa-success"}`}>
              {plan.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {plan.kind === "lock" ? (
          <p className="text-[10px] leading-5 font-medium text-jumpa-black">
            Locked balance{" "}
            <span className={`font-bold ${isClosed ? "text-jumpa-neutral-600" : "text-jumpa-primary-500"}`}>
              {plan.saved}
            </span>
          </p>
        ) : (
          <p className="text-[10px] leading-5 font-medium text-jumpa-black">
            Saved{" "}
            <span className={`font-bold ${isClosed ? "text-jumpa-neutral-600" : "text-jumpa-primary-500"}`}>
              {plan.saved}
            </span>
            {" / "}
            <span className={`font-bold ${isClosed ? "text-jumpa-neutral-500" : "text-jumpa-primary-500"}`}>
              {plan.target}
            </span>{" "}
            target
          </p>
        )}
        <div className="h-1 w-full overflow-hidden bg-jumpa-primary-200">
          <div
            className={`h-full transition-all duration-300 ${
              isClosed ? "bg-jumpa-neutral-300" : "bg-jumpa-primary-400"
            }`}
            style={{ width: `${plan.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] leading-2.5 font-semibold text-jumpa-secondary-950">
          <span className={isClosed ? "text-jumpa-neutral-400" : ""}>{timeLabel}</span>
          <span className={isClosed ? "text-jumpa-neutral-400" : ""}>
            {plan.kind === "lock" ? `${plan.percent}% term elapsed` : `${plan.percent}%`}
          </span>
        </div>
      </div>
    </>
  );

  const shell = `flex flex-col gap-6 rounded-surface border p-4 transition-all ${
    isClosed
      ? "border-jumpa-neutral-200 bg-jumpa-neutral-50/70 opacity-80"
      : "border-jumpa-primary-300 bg-jumpa-secondary-50"
  }`;

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

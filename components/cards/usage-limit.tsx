import type { UsageLimit as Limit } from "@/lib/cards";

/** Spend allowance for one channel. The slider is presentational — no control in the design. */
export function UsageLimit({ limit }: { limit: Limit }) {
  const fill = `${(limit.used * 100).toFixed(2)}%`;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm leading-4 font-medium text-jumpa-black">
        {limit.label}
      </h2>

      <div className="flex flex-col gap-3.5 rounded-card bg-jumpa-primary-600 px-4.5 py-3.5">
        <div className="flex items-baseline justify-between text-xs leading-3.5 font-medium">
          <span className="text-jumpa-white">Today Limits</span>
          <span className="text-jumpa-alt-400">
            {limit.spent}
            <span className="text-jumpa-primary-300">/{limit.cap}</span>
          </span>
        </div>

        <div className="relative h-6.5">
          <span className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-pill bg-jumpa-primary-500" />
          <span
            className="absolute top-1/2 left-0 h-3 -translate-y-1/2 rounded-pill bg-jumpa-alt-400"
            style={{ width: fill }}
          />
          <span
            className="absolute top-0 flex size-6.5 -translate-x-1/2 items-center justify-center rounded-full bg-jumpa-alt-300"
            style={{ left: fill }}
          >
            <span className="size-5 rounded-full bg-jumpa-alt-400" />
          </span>
        </div>

        <p className="text-right text-[10px] leading-3 text-jumpa-primary-300">
          Refreshes every 24 hours
        </p>
      </div>
    </section>
  );
}

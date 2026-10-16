import { cn } from "@/lib/cn";
import {
  STATUS_COPY,
  type StatusTone,
  type TicketStatus,
} from "@/lib/support-tickets";

/** The dot carries the tone; the label stays dark so it reads at 12px. */
const DOT: Record<StatusTone, string> = {
  ai: "bg-jumpa-primary-600",
  waiting: "bg-jumpa-warning",
  active: "bg-jumpa-success",
  done: "bg-jumpa-neutral-300",
};

export function StatusChip({ status }: { status: TicketStatus }) {
  const { label, tone } = STATUS_COPY[status];

  return (
    <span className="inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white px-2 text-xs leading-3.5 font-medium text-jumpa-neutral-700 ring-1 ring-jumpa-neutral-60 ring-inset">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", DOT[tone])}
      />
      {label}
    </span>
  );
}

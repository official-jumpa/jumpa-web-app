import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons/close";
import { TriangleDownIcon } from "@/components/ui/icons/triangle-down";

/** Close / filter / new-thread controls. The wash behind them is ChatTopFade. */
export function ChatHeader({ onNew }: { onNew: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between pt-[calc(env(safe-area-inset-top)+13px)] pr-4.5 pl-4">
      <Link
        href="/home"
        aria-label="Close chat"
        className="flex size-9.5 items-center justify-center rounded-pill border border-jumpa-neutral-50 bg-jumpa-grey-300 text-jumpa-white"
      >
        <CloseIcon className="size-5" />
      </Link>

      <button
        type="button"
        className="flex h-7 items-center gap-3 rounded-pill bg-jumpa-secondary-100 px-3 text-xs leading-5 font-medium text-jumpa-primary-950"
      >
        Recent
        <TriangleDownIcon className="size-3 text-jumpa-primary-600" />
      </button>

      <button
        type="button"
        onClick={onNew}
        aria-label="New conversation"
        className="flex size-9.5 items-center justify-center rounded-pill border border-jumpa-primary-600 bg-jumpa-primary-100 text-xs text-jumpa-primary-600"
      >
        +
      </button>
    </header>
  );
}

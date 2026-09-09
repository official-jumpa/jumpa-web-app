import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/notifications";

// inset-ring, not border: a CSS border sits outside the box and would add 2px
// to the design's 130px card, compounding down the feed.
const CARD =
  "flex w-full flex-col gap-2 rounded-surface bg-jumpa-neutral-50 px-6 py-5 text-left inset-ring-1 inset-ring-jumpa-neutral-60";

/** One feed entry. Unread carries the dot and reads itself when tapped. */
export function NotificationCard({
  item,
  read,
  onRead,
}: {
  item: Notification;
  read: boolean;
  onRead: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="relative flex size-6 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-jumpa-primary-600 to-jumpa-primary-400">
          <Image
            src="/logo/mark/lemon.png"
            alt=""
            width={29}
            height={14}
            className="w-[14.5px]"
          />
          {read ? null : (
            <span className="absolute top-0 -right-0.75 size-2 rounded-full bg-jumpa-danger" />
          )}
        </span>
        <p className="text-xs leading-3.5 font-medium text-jumpa-black">
          {item.title}
        </p>
      </div>

      {/* -mb-px: the design draws the rule as a zero-height line. */}
      <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />

      <p className="max-w-[241px] text-[10px] leading-3.5 text-jumpa-black">
        {item.body}
      </p>

      <div className="flex items-center justify-between text-[10px] leading-3.5 font-medium">
        <span className="text-jumpa-neutral-265">{item.time}</span>
        <span className={read ? "text-jumpa-neutral-265" : "text-jumpa-black"}>
          {read ? "Read" : "Unread"}
        </span>
      </div>
    </>
  );

  // A read card has nothing left to do, so it is not a control.
  if (read) return <article className={CARD}>{body}</article>;

  return (
    <button
      type="button"
      onClick={onRead}
      className={cn(CARD, "tap active:scale-[0.99]")}
    >
      {body}
    </button>
  );
}

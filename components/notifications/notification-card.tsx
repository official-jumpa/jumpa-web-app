import Image from "next/image";
import { LocalTime } from "@/components/ui/local-time";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/notifications";

/** One feed entry. The whole card opens the notification; unread carries the dot. */
export function NotificationCard({
  item,
  read,
  onOpen,
}: {
  item: Notification;
  read: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "tap flex w-full flex-col gap-2 rounded-surface px-4 py-3 text-left transition-all active:scale-[0.99]",
        "border border-jumpa-neutral-90 bg-jumpa-neutral-25/50 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex size-6 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-jumpa-primary-600 to-jumpa-primary-400">
            <Image
              src="/logo/mark/lemon.png"
              alt=""
              width={29}
              height={14}
              className="w-[14.5px]"
            />
            {read ? null : (
              <span className="absolute top-0 -right-0.75 size-2 rounded-full bg-jumpa-danger ring-2 ring-white" />
            )}
          </span>
          <p className="truncate text-xs leading-4 font-semibold text-jumpa-black">
            {item.title}
          </p>
        </div>
        <LocalTime
          at={item.createdAt}
          fallback={item.time}
          format="notification"
          className="shrink-0 text-[10px] leading-3.5 font-medium text-jumpa-neutral-265"
        />
      </div>

      <span className="-mb-px block h-px w-full bg-jumpa-neutral-90" />

      <p className="text-[11px] leading-4 text-jumpa-neutral-600 line-clamp-2">
        {item.body}
      </p>
    </button>
  );
}

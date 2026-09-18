"use client";

import Image from "next/image";
import { CloseButton } from "@/components/transfer/close-button";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/ui/sheet-portal";
import type { Notification } from "@/lib/notifications";

/**
 * One notification, in full. A sheet rather than a route: the payload is a
 * title, a line of body and a timestamp, which leaves a whole screen empty —
 * and dismissing it is the "go back" the feed expects.
 */
export function NotificationDetail({
  item,
  onClose,
}: {
  item: Notification;
  onClose: () => void;
}) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-jumpa-primary-600 to-jumpa-primary-400">
            <Image
              src="/logo/mark/lemon.png"
              alt=""
              width={29}
              height={14}
              className="w-6"
            />
          </span>
          <CloseButton onClick={onClose} label="Close notification" size="sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-base leading-5 font-medium text-jumpa-black">
            {item.title}
          </h2>
          <p className="text-[10px] leading-3.5 font-medium text-jumpa-neutral-265">
            {item.time}
          </p>
        </div>

        <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />

        <p className="text-xs leading-5 text-jumpa-black">{item.body}</p>
      </div>

      <Button variant="gradient" size="lg" className="mt-6" onClick={onClose}>
        Done
      </Button>
    </SheetPortal>
  );
}

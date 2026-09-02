"use client";

import Image from "next/image";
import { useState } from "react";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Notification } from "@/lib/notifications";

/** The feed, with the read state held locally until there is a service for it. */
export function NotificationList({ items }: { items: Notification[] }) {
  const [read, setRead] = useState(() =>
    items.filter((n) => n.read).map((n) => n.id),
  );

  const markAll = () => setRead(items.map((n) => n.id));

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        title="Notifications"
        round
        action={
          <button
            type="button"
            onClick={markAll}
            className="tap rounded-pill bg-jumpa-neutral-50 px-2.5 py-1.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95"
          >
            Read All
          </button>
        }
      />

      <ul className="mt-6 flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
        {items.map((item, index) => (
          <li key={item.id} className="flex flex-col gap-4">
            {/* -mb-px: the design draws a zero-height line between rows. */}
            {index > 0 ? (
              <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
            ) : null}

            <article className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Image
                  src={item.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-sm leading-4 font-semibold text-jumpa-black">
                    {item.title}
                  </h2>
                  <p className="text-[10px] leading-3.5 font-medium text-jumpa-neutral-700">
                    {item.body}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs leading-3.5 font-medium text-jumpa-neutral-425">
                {read.includes(item.id) ? "Read" : "New"}
              </span>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

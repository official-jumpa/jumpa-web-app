"use client";

import { useState } from "react";
import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationsEmpty } from "@/components/notifications/notifications-empty";
import { ScreenHeader } from "@/components/ui/screen-header";
import { cn } from "@/lib/cn";
import {
  NOTIFICATION_TABS,
  type Notification,
  type NotificationTab,
} from "@/lib/notifications";

const CHIP =
  "tap rounded-pill px-5.5 py-2.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95";

/** The feed, with the read state held locally until there is a service for it. */
export function NotificationList({ items }: { items: Notification[] }) {
  const [tab, setTab] = useState<NotificationTab>("transactions");
  const [read, setRead] = useState(
    () => new Set(items.filter((item) => item.read).map((item) => item.id)),
  );

  const markRead = (id: string) =>
    setRead((current) => new Set(current).add(id));

  const shown = items.filter((item) => item.tab === tab);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        title="Notifications"
        round
        action={
          <button
            type="button"
            onClick={() => setRead(new Set(items.map((item) => item.id)))}
            className="tap rounded-pill bg-jumpa-neutral-50 px-2.5 py-1.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95"
          >
            Read All
          </button>
        }
      />

      <div className="mt-5 flex items-center gap-2">
        {NOTIFICATION_TABS.map(({ id, label }) => {
          const count = items.reduce(
            (total, item) => (item.tab === id ? total + 1 : total),
            0,
          );

          return (
            <button
              key={id}
              type="button"
              aria-pressed={id === tab}
              onClick={() => setTab(id)}
              className={cn(
                CHIP,
                id === tab ? "bg-jumpa-primary-50" : "bg-jumpa-neutral-50",
              )}
            >
              {count > 0 ? `${label} (${count})` : label}
            </button>
          );
        })}
      </div>

      {shown.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {shown.map((item) => (
            <li key={item.id}>
              <NotificationCard
                item={item}
                read={read.has(item.id)}
                onRead={() => markRead(item.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <NotificationsEmpty />
      )}
    </div>
  );
}

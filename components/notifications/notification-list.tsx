"use client";

import { useEffect, useState, useCallback } from "react";
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
  "tap rounded-pill px-5.5 py-2.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95 transition-colors";

export function NotificationList({
  initialItems = [],
}: {
  initialItems?: Notification[];
}) {
  const [tab, setTab] = useState<NotificationTab>("transactions");
  const [items, setItems] = useState<Notification[]>(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [tabCounts, setTabCounts] = useState<{ transactions: number; activities: number }>({
    transactions: 0,
    activities: 0,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) {
          setItems(data.notifications);
        }
        if (data.tabCounts) {
          setTabCounts(data.tabCounts);
        }
      }
    } catch (err) {
      console.warn("[NotificationList] Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    // Optimistic local update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );

    try {
      await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("[NotificationList] Error marking as read:", err);
    }
  };

  const markAllRead = async () => {
    // Optimistic local update
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await fetch(`/api/notifications?action=read-all&tab=${tab}`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("[NotificationList] Error marking all as read:", err);
    }
  };

  const shown = items.filter((item) => item.tab === tab);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        title="Notifications"
        round
        action={
          shown.some((i) => !i.read) ? (
            <button
              type="button"
              onClick={markAllRead}
              className="tap rounded-pill bg-jumpa-neutral-50 px-2.5 py-1.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95"
            >
              Read All
            </button>
          ) : null
        }
      />

      <div className="mt-5 flex items-center gap-2">
        {NOTIFICATION_TABS.map(({ id, label }) => {
          const count = tabCounts[id] ?? items.filter((item) => item.tab === id).length;

          return (
            <button
              key={id}
              type="button"
              aria-pressed={id === tab}
              onClick={() => setTab(id)}
              className={cn(
                CHIP,
                id === tab ? "bg-jumpa-primary-50 font-semibold" : "bg-jumpa-neutral-50",
              )}
            >
              {count > 0 ? `${label} (${count})` : label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-surface bg-jumpa-neutral-50/50"
            />
          ))}
        </div>
      ) : shown.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {shown.map((item) => (
            <li key={item.id}>
              <NotificationCard
                item={item}
                read={item.read}
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

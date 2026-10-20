"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationDetail } from "@/components/notifications/notification-detail";
import { NotificationsEmpty } from "@/components/notifications/notifications-empty";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { invalidateClientNotifications } from "@/lib/client-events";
import { cn } from "@/lib/cn";
import {
  NOTIFICATION_TABS,
  type Notification,
  type NotificationTab,
} from "@/lib/notifications";

const CHIP =
  "tap rounded-pill px-5.5 py-2.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95 transition-all";

export function NotificationList({
  initialItems,
  initialTabCounts,
}: {
  initialItems?: Notification[];
  initialTabCounts?: { transactions: number; activities: number };
}) {
  const hasServerData = initialItems !== undefined;
  const [tab, setTab] = useState<NotificationTab>("transactions");
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!hasServerData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabCounts, setTabCounts] = useState<{ transactions: number; activities: number }>(
    initialTabCounts || {
      transactions: 0,
      activities: 0,
    },
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/notifications`);
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        if (payload.notifications) {
          setItems(payload.notifications);
        }
        if (payload.tabCounts) {
          setTabCounts(payload.tabCounts);
        }
      }
    } catch (err) {
      console.warn("[NotificationList] Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasServerData) {
      fetchNotifications();
    }
  }, [hasServerData, fetchNotifications]);

  const markRead = (id: string) => {
    // Instant optimistic local update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    invalidateClientNotifications();

    fetch(`/api/v1/notifications?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
    }).catch((err) => {
      console.error("[NotificationList] Error marking as read:", err);
    });
  };

  const open = (item: Notification) => {
    setOpenId(item.id);
    if (!item.read) markRead(item.id);
  };

  const markAllRead = () => {
    // Instant optimistic update strictly scoped to the active tab
    setItems((prev) =>
      prev.map((item) => (item.tab === tab ? { ...item, read: true } : item)),
    );
    invalidateClientNotifications();

    fetch(`/api/v1/notifications?action=read-all&tab=${tab}`, {
      method: "PATCH",
    }).catch((err) => {
      console.error("[NotificationList] Error marking all as read:", err);
    });
  };

  const shown = items.filter((item) => item.tab === tab);
  const countForTab = tabCounts[tab] ?? shown.length;
  const hasMore = shown.length < countForTab;
  const opened = items.find((item) => item.id === openId);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/v1/notifications?tab=${tab}&limit=15&skip=${shown.length}`,
      );
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        if (payload.notifications && payload.notifications.length > 0) {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const incoming = payload.notifications.filter(
              (i: Notification) => !existingIds.has(i.id),
            );
            return [...prev, ...incoming];
          });
        }
        if (payload.tabCounts) {
          setTabCounts(payload.tabCounts);
        }
      }
    } catch (err) {
      console.warn("[NotificationList] Failed to load more notifications:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, tab, shown.length]);

  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back="/home"
        title="Notifications"
        round
        action={
          shown.some((i) => !i.read) ? (
            <button
              type="button"
              onClick={markAllRead}
              className="tap rounded-pill bg-jumpa-neutral-50 border border-jumpa-neutral-100 px-3 py-1.5 text-[10px] leading-3.5 font-medium text-jumpa-black active:scale-95 transition-all"
            >
              Read All
            </button>
          ) : null
        }
      />

      <div
        role="tablist"
        aria-label="Notification categories"
        className="mt-5 flex items-center gap-2"
      >
        {NOTIFICATION_TABS.map(({ id, label }) => {
          const count = tabCounts[id] ?? items.filter((item) => item.tab === id).length;

          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={id === tab}
              onClick={() => setTab(id)}
              className={cn(
                CHIP,
                id === tab
                  ? "bg-jumpa-primary-50 font-semibold text-jumpa-primary-900 shadow-xs"
                  : "bg-jumpa-neutral-50 border border-jumpa-neutral-95 text-jumpa-neutral-600",
              )}
            >
              {count > 0 ? `${label} (${count})` : label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 flex flex-col gap-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-22 animate-pulse rounded-surface border border-jumpa-neutral-100 bg-jumpa-neutral-25/50"
            />
          ))}
        </div>
      ) : shown.length > 0 ? (
        <>
          <ul className="mt-4 flex flex-col gap-2.5">
            {shown.map((item) => (
              <li key={item.id}>
                <NotificationCard
                  item={item}
                  read={item.read}
                  onOpen={() => open(item)}
                />
              </li>
            ))}
          </ul>

          {hasMore ? (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6"
            >
              {loadingMore ? (
                <JumpaLoader
                  className="size-8"
                  markClassName="w-4"
                  label="Loading more notifications"
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <NotificationsEmpty />
      )}

      {opened ? (
        <NotificationDetail item={opened} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}

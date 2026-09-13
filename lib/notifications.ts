export type NotificationTab = "transactions" | "activities";

export type Notification = {
  id: string;
  tab: NotificationTab;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

/**
 * Formats a Date into a friendly human relative string e.g. "Today 12:32 AM", "Yesterday 3:45 PM", "Aug 24, 1:30 PM".
 */
export function formatNotificationTime(dateVal: Date | string): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday ${timeStr}`;

  const monthStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${monthStr}, ${timeStr}`;
}

/** The two chips above the feed, in the design's order. */
export const NOTIFICATION_TABS: { id: NotificationTab; label: string }[] = [
  { id: "transactions", label: "Transactions" },
  { id: "activities", label: "Activities" },
];
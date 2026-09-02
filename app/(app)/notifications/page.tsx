import type { Metadata } from "next";
import { NotificationList } from "@/components/notifications/notification-list";
import { NOTIFICATIONS } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationList items={NOTIFICATIONS} />;
}

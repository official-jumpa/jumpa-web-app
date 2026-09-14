import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserNotifications } from "@/lib/functions/notificationFunctions";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Notification } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  let initialNotifications: Notification[] = [];
  let initialTabCounts = { transactions: 0, activities: 0 };

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const data = await getUserNotifications(session.user.id, { limit: 30 });
      initialNotifications = (data.notifications as any) || [];
      if (data.tabCounts) {
        initialTabCounts = data.tabCounts;
      }
    }
  } catch (error) {
    console.warn("[NotificationsPage]:", error);
  }

  return (
    <NotificationList
      initialItems={initialNotifications}
      initialTabCounts={initialTabCounts}
    />
  );
}

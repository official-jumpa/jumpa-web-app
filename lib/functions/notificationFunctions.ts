import { connectDB } from "@/lib/db";
import { formatNotificationTime } from "@/lib/notifications";
import {
  type INotification,
  Notification,
  type NotificationTab,
} from "@/models/Notification";
import { shouldSendNotification } from "@/lib/functions/userPreferenceFunctions";

/**
 * Creates and persists a new in-app notification respecting the user's notification preferences.
 */
export async function createNotification(
  data: Partial<INotification>,
): Promise<INotification | null> {
  if (data.userId && data.type) {
    const allowed = await shouldSendNotification(data.userId, data.type);
    if (!allowed) {
      return null;
    }
  }
  await connectDB();
  return Notification.create(data);
}

/**
 * Queries user notifications with optional tab filtering and tab counts.
 */
export async function getUserNotifications(
  userId: string,
  options: {
    tab?: NotificationTab;
    limit?: number;
    unreadOnly?: boolean;
    skip?: number;
  } = {},
) {
  await connectDB();

  const limit = Math.min(100, Math.max(1, options.limit || 30));
  const skip = Math.max(0, options.skip || 0);

  const query: Record<string, any> = { userId };
  if (options.tab) query.tab = options.tab;
  if (options.unreadOnly) query.read = false;

  const [
    rawNotifications,
    total,
    totalUnread,
    transactionsCount,
    activitiesCount,
  ] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<INotification[]>(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, read: false }),
    Notification.countDocuments({ userId, tab: "transactions" }),
    Notification.countDocuments({ userId, tab: "activities" }),
  ]);

  const notifications = rawNotifications.map((notif) => ({
    id: notif._id,
    tab: notif.tab,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    time: formatNotificationTime(notif.createdAt),
    read: Boolean(notif.read),
    metadata: notif.metadata,
    link: notif.link,
    createdAt: notif.createdAt,
  }));

  return {
    notifications,
    total,
    unreadCount: totalUnread,
    tabCounts: {
      transactions: transactionsCount,
      activities: activitiesCount,
    },
  };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  await connectDB();
  const res = await Notification.updateOne(
    { _id: notificationId, userId },
    { $set: { read: true, updatedAt: new Date() } },
  );
  return res.modifiedCount > 0;
}

/**
 * Marks all notifications for a user as read (optionally filtered by tab).
 */
export async function markAllNotificationsAsRead(
  userId: string,
  tab?: NotificationTab,
): Promise<number> {
  await connectDB();
  const filter: Record<string, any> = { userId, read: false };
  if (tab) filter.tab = tab;

  const res = await Notification.updateMany(filter, {
    $set: { read: true, updatedAt: new Date() },
  });
  return res.modifiedCount;
}

/**
 * Returns total unread notification count for a user.
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ userId, read: false });
}

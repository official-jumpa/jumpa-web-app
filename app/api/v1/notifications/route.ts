import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  createNotification,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/functions/notificationFunctions";
import {
  listNotificationsQuerySchema,
  updateNotificationQuerySchema,
  createNotificationSchema,
} from "@/lib/validations/notification.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/notifications
 * Returns paginated user notifications, unread count, and tab counters.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "notifications_get" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const searchParams = req.nextUrl.searchParams;
    const validation = listNotificationsQuerySchema.safeParse({
      tab: searchParams.get("tab") || undefined,
      unreadOnly: searchParams.get("unreadOnly") || undefined,
      limit: searchParams.get("limit") || undefined,
      skip: searchParams.get("skip") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { tab, unreadOnly, limit, skip } = validation.data;

    const data = await getUserNotifications(session.user.id, {
      tab,
      unreadOnly,
      limit,
      skip,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/v1/notifications
 * Marks a single notification or all notifications in a tab as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "medium", action: "notifications_mark_read" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const searchParams = req.nextUrl.searchParams;
    const validation = updateNotificationQuerySchema.safeParse({
      id: searchParams.get("id") || undefined,
      action: searchParams.get("action") || undefined,
      tab: searchParams.get("tab") || undefined,
      readAll: searchParams.get("readAll") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { id, action, tab, readAll } = validation.data;

    if (action === "read-all" || readAll === "true") {
      const modifiedCount = await markAllNotificationsAsRead(
        session.user.id,
        tab,
      );
      return NextResponse.json({
        success: true,
        data: { modifiedCount },
      });
    }

    if (id) {
      const ok = await markNotificationAsRead(id, session.user.id);
      return NextResponse.json({
        success: true,
        data: { updated: ok },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid query parameters" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Failed to update notification status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/notifications
 * Creates an in-app notification for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "medium", action: "notifications_create" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { tab, type, title, body: notifBody, metadata, link } =
      validation.data;

    const created = await createNotification({
      userId: session.user.id,
      tab,
      type,
      title,
      body: notifBody,
      metadata,
      link,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          notification: created
            ? {
                id: created._id,
                tab: created.tab,
                type: created.type,
                title: created.title,
                body: created.body,
                read: created.read,
                createdAt: created.createdAt,
                metadata: created.metadata,
                link: created.link,
              }
            : null,
        },
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Failed to create notification" },
      { status: 500 },
    );
  }
}

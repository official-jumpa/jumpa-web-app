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

/**
 * Single unified API endpoint for all notification operations.
 *
 * GET /api/notifications
 *   Query params: tab, unreadOnly, limit, skip
 *
 * PATCH /api/notifications
 *   Query params: id, action ('read-all'), tab
 *
 * POST /api/notifications
 *   Body: { tab, type, title, body, metadata?, link? }
 */

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
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
      ...data,
    });
  } catch (err: any) {
    console.error("[Notifications API GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
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
        modifiedCount,
      });
    }

    if (id) {
      const ok = await markNotificationAsRead(id, session.user.id);
      return NextResponse.json({
        success: true,
        updated: ok,
      });
    }

    return NextResponse.json(
      { error: "Provide either ?id=<notificationId> or ?action=read-all" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[Notifications API PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update notification status" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
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
        notification: created,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[Notifications API POST]", err);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}

import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createNotification,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/functions/notificationFunctions";
import type { NotificationTab } from "@/models/Notification";

/**
 * Single unified API endpoint for all notification operations.
 *
 * GET /api/notifications
 *   Query params:
 *   - tab: 'transactions' | 'activities'
 *   - unreadOnly: 'true' | 'false'
 *   - limit: number
 *   - skip: number
 *
 * PATCH /api/notifications
 *   Query params:
 *   - id: notificationId (marks single notification as read)
 *   - action: 'read-all' (marks all as read, optionally filtered by ?tab=)
 *
 * POST /api/notifications
 *   Body: { tab, type, title, body, metadata?, link? }
 */

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const tab = searchParams.get("tab") as NotificationTab | null;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 30;
    const skipParam = searchParams.get("skip");
    const skip = skipParam ? parseInt(skipParam, 10) : 0;

    const data = await getUserNotifications(session.user.id, {
      tab:
        tab && (tab === "transactions" || tab === "activities")
          ? tab
          : undefined,
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    const tab = searchParams.get("tab") as NotificationTab | null;

    if (action === "read-all" || searchParams.get("readAll") === "true") {
      const modifiedCount = await markAllNotificationsAsRead(
        session.user.id,
        tab && (tab === "transactions" || tab === "activities")
          ? tab
          : undefined,
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.title || !body.body || !body.tab || !body.type) {
      return NextResponse.json(
        {
          error:
            "Missing required notification fields (title, body, tab, type)",
        },
        { status: 400 },
      );
    }

    const created = await createNotification({
      userId: session.user.id,
      tab: body.tab,
      type: body.type,
      title: body.title,
      body: body.body,
      metadata: body.metadata,
      link: body.link,
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

import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  getUserActiveSessions,
  deleteUserActiveSession,
  deleteOtherUserSessions,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { parseUserAgent } from "@/lib/user-agent";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;

    const session = auth.session;
    const rawSessions = await getUserActiveSessions(session.user.id);

    const currentToken = session.session?.token;
    const currentId = session.session?.id;

    const sessions = rawSessions.map((s: any) => {
      const isCurrent =
        (currentId && s._id === currentId) ||
        (currentToken && s.token === currentToken);

      const parsed = parseUserAgent(s.userAgent);

      return {
        id: s._id,
        isCurrent: Boolean(isCurrent),
        ipAddress: s.ipAddress || "Unknown IP",
        userAgent: s.userAgent || "",
        os: parsed.os,
        browser: parsed.browser,
        deviceType: parsed.deviceType,
        deviceLabel: parsed.deviceLabel,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        expiresAt: s.expiresAt,
      };
    });

    return NextResponse.json({
      success: true,
      sessions,
      total: sessions.length,
    });
  } catch (err: any) {
    console.error("[Sessions API GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch active sessions" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;

    const session = auth.session;
    const searchParams = req.nextUrl.searchParams;
    const target = searchParams.get("target");
    const targetId = searchParams.get("id");

    const currentToken = session.session?.token;
    const currentId = session.session?.id;

    if (target === "others") {
      const deletedCount = await deleteOtherUserSessions(
        session.user.id,
        currentId,
        currentToken,
      );

      await logUserActivity({
        userId: session.user.id,
        action: "ALL_OTHER_SESSIONS_REVOKED",
        details: { count: deletedCount },
        req,
      });

      return NextResponse.json({
        success: true,
        revokedCount: deletedCount,
      });
    }

    if (targetId) {
      if (targetId === currentId) {
        return NextResponse.json(
          {
            error: "Cannot revoke current session. Please use logout instead.",
          },
          { status: 400 },
        );
      }

      const deleted = await deleteUserActiveSession(session.user.id, targetId);

      await logUserActivity({
        userId: session.user.id,
        action: "SESSION_REVOKED",
        details: { sessionId: targetId },
        req,
      });

      return NextResponse.json({
        success: true,
        deleted,
      });
    }

    return NextResponse.json(
      { error: "Provide either ?target=others or ?id=<sessionId>" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[Sessions API DELETE]", err);
    return NextResponse.json(
      { error: "Failed to revoke session(s)" },
      { status: 500 },
    );
  }
}

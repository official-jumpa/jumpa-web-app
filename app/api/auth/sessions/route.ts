import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { parseUserAgent } from "@/lib/user-agent";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const db = getDb();

    // Query active sessions that have not expired yet
    const rawSessions = await db
      .collection("session")
      .find({
        userId: session.user.id,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .toArray();

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const target = searchParams.get("target");
    const targetId = searchParams.get("id");

    await connectDB();
    const db = getDb();
    const currentToken = session.session?.token;
    const currentId = session.session?.id;

    if (target === "others") {
      // Delete all sessions for user EXCEPT the current session
      const filter: Record<string, any> = { userId: session.user.id };
      if (currentId) {
        filter._id = { $ne: currentId };
      } else if (currentToken) {
        filter.token = { $ne: currentToken };
      }

      const result = await db.collection("session").deleteMany(filter);

      await logUserActivity({
        userId: session.user.id,
        action: "ALL_OTHER_SESSIONS_REVOKED",
        details: { count: result.deletedCount },
        req,
      });

      return NextResponse.json({
        success: true,
        revokedCount: result.deletedCount,
      });
    }

    if (targetId) {
      // Cannot delete current session via this route (use standard logout for current)
      if (targetId === currentId) {
        return NextResponse.json(
          {
            error: "Cannot revoke current session. Please use logout instead.",
          },
          { status: 400 },
        );
      }

      const result = await db.collection("session").deleteOne({
        _id: targetId as any,
        userId: session.user.id,
      });

      await logUserActivity({
        userId: session.user.id,
        action: "SESSION_REVOKED",
        details: { sessionId: targetId },
        req,
      });

      return NextResponse.json({
        success: true,
        deleted: result.deletedCount > 0,
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

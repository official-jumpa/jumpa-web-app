import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { User } from "@/models/User";
import { connectDB } from "@/lib/db";

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    let kind = searchParams.get("kind");

    if (!kind) {
      try {
        const body = await req.json();
        kind = body.kind;
      } catch {}
    }

    console.log("[POST /api/savings/intro-seen] Received request:", { userId, kind });

    if (!kind || !["individual", "lock", "circle"].includes(kind)) {
      console.warn(`[POST /api/savings/intro-seen] Invalid kind: '${kind}' for user ${userId}`);
      return NextResponse.json(
        { error: "Valid kind ('individual', 'lock', 'circle') is required" },
        { status: 400 },
      );
    }

    await connectDB();
    await User.updateOne(
      { _id: userId },
      { $set: { [`seenSavingsIntros.${kind}`]: true } },
    );

    console.log(`[POST /api/savings/intro-seen] User ${userId} marked intro for '${kind}' as seen.`);

    return NextResponse.json({ ok: true, kind, seen: true });
  } catch (err: any) {
    console.error("[POST /api/savings/intro-seen] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark intro as seen" },
      { status: 500 },
    );
  }
});

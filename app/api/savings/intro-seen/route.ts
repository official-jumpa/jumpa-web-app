import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { markSavingsIntroSeen } from "@/lib/functions/userFunctions";
import { savingsIntroSeenSchema } from "@/lib/validations/savings.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

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

    const validation = savingsIntroSeenSchema.safeParse({ kind });
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    await markSavingsIntroSeen(userId, validation.data.kind);

    return NextResponse.json({ ok: true, kind: validation.data.kind, seen: true });
  } catch (err: any) {
    console.error("[POST /api/savings/intro-seen] Unexpected Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark intro as seen" },
      { status: 500 },
    );
  }
});

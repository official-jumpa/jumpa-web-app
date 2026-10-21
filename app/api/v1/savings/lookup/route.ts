import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SavingsPlan } from "@/models/SavingsPlan";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/savings/lookup?code=C8H2KX
 * Resolves a circle savings plan by its invite code or plan ID.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "savings_lookup" },
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);

    // Strict query parameter enforcement: only 'code' is permitted
    for (const key of searchParams.keys()) {
      if (key !== "code") {
        return NextResponse.json(
          { error: "Invalid request parameters" },
          { status: 400 },
        );
      }
    }

    const rawCode = searchParams.get("code")?.trim() || "";
    const code = rawCode.toUpperCase();

    if (!code || code.length < 2 || code.length > 30) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 },
      );
    }

    await connectDB();

    // Query exact case-insensitive match without arbitrary regex expansion
    const plan = await SavingsPlan.findOne({
      kind: "circle",
      status: "Active",
      $or: [
        { "circleConfig.inviteCode": code },
        { _id: code.toLowerCase() },
      ],
    });

    if (!plan) {
      return NextResponse.json(
        { error: "No active circle matches this invite code" },
        { status: 404 },
      );
    }

    const membersCount = plan.circleConfig?.members?.length || 1;
    const capacity = plan.circleConfig?.capacity || 4;
    const isFull = membersCount >= capacity;

    const isMember = (plan.circleConfig?.members || []).some(
      (m) => m.userId === auth.userId,
    );

    return NextResponse.json({
      circle: {
        id: plan._id,
        name: plan.name,
        currency: plan.currency,
        target: plan.targetAmount,
        saved: plan.currentAmount,
        style: plan.circleConfig?.type || "save_together",
        inviteCode: plan.circleConfig?.inviteCode || code,
        membersCount,
        capacity,
        isFull,
        isMember,
        endDate: plan.endDate
          ? new Date(plan.endDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null,
      },
    });
  } catch (err: any) {
    console.error(`Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to lookup circle" },
      { status: 500 },
    );
  }
}

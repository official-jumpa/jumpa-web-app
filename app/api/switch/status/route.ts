import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";
import { switchStatusQuerySchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const reference = req.nextUrl.searchParams.get("reference");
    const validation = switchStatusQuerySchema.safeParse({ reference });
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    const result = await SwitchService.getTransactionStatus(validation.data.reference);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || "Failed to fetch transaction status" },
        { status: 400 },
      );
    }

    const rawStatus = (result.data?.status || "").toUpperCase();

    // Normalize status for UI consumers
    const isCompleted = [
      "COMPLETED",
      "SUCCESS",
      "SUCCESSFUL",
      "DELIVERED",
      "SETTLED",
    ].includes(rawStatus);

    const isAwaiting = [
      "AWAITING_DEPOSIT",
      "PENDING",
      "PROCESSING",
      "IN_PROGRESS",
      "CONFIRMING",
      "INITIATED",
    ].includes(rawStatus);

    const isFailed = ["FAILED", "EXPIRED", "CANCELLED", "REJECTED"].includes(rawStatus);

    let humanMessage = "Awaiting deposit. Waiting for a few seconds before trying again.";
    if (isCompleted) {
      humanMessage = "Transaction completed successfully.";
    } else if (isFailed) {
      humanMessage = "Transaction failed or expired. Please initiate a new transaction.";
    } else if (isAwaiting) {
      humanMessage = "Deposit received. Processing payout...";
    }

    return NextResponse.json({
      success: true,
      status: rawStatus,
      isCompleted,
      isAwaiting,
      isFailed,
      message: humanMessage,
      data: result.data,
    });
  } catch (err: any) {
    console.error("[Switch Status API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

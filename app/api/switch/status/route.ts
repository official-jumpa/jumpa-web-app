import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SwitchService } from "@/lib/switch";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const reference = req.nextUrl.searchParams.get("reference");

    console.log(`[Switch Status API] [User: ${userId}] → Checking status for reference:`, reference);

    if (!reference) {
      return NextResponse.json({ success: false, error: "reference is required" }, { status: 400 });
    }

    const result = await SwitchService.getTransactionStatus(reference);

    console.log(`[Switch Status API] [User: ${userId}] ← Raw response:`, result);

    if (!result.success) {
      console.error(`[Switch Status API] [User: ${userId}] ✗ Error:`, result.message);
      return NextResponse.json(
        { success: false, error: result.message || "Failed to fetch transaction status" },
        { status: 400 }
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
      humanMessage = "Payment confirmed and completed successfully!";
    } else if (rawStatus === "AWAITING_DEPOSIT") {
      humanMessage = "Awaiting deposit. If you have already sent the funds, wait a few seconds and try again.";
    } else if (rawStatus === "PROCESSING" || rawStatus === "IN_PROGRESS" || rawStatus === "CONFIRMING") {
      humanMessage = "Deposit received! Verifying and updating your balances...";
    } else if (rawStatus === "EXPIRED") {
      humanMessage = "This transfer session has expired. Please initiate a new deposit.";
    } else if (isFailed) {
      humanMessage = "Transaction failed or was cancelled.";
    }

    return NextResponse.json({
      success: true,
      status: rawStatus,
      isCompleted,
      isAwaiting,
      isFailed,
      type: result.data?.type,
      reference,
      message: humanMessage,
      data: result.data,
    });
  } catch (err: any) {
    console.error("[Switch Status API] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

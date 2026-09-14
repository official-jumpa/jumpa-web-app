import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { SwitchService } from "@/lib/switch";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { switchStatusQuerySchema } from "@/lib/validations/switch.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  findTransactionByReference,
  updateTransactionByReference,
} from "@/lib/functions/transactionFunctions";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;

    const session = auth.session;
    const reference = req.nextUrl.searchParams.get("reference");
    const validation = switchStatusQuerySchema.safeParse({ reference });
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }

    // Return instantly if already settled in our database
    const existingTx = await findTransactionByReference(validation.data.reference);

    if (existingTx && existingTx.status === "CONFIRMED") {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        isCompleted: true,
        isAwaiting: false,
        isFailed: false,
        message: "Transaction completed",
        data: {
          status: "COMPLETED",
          reference: validation.data.reference,
          meta: {
            hash: existingTx.txHash,
            explorer_url: existingTx.explorerUrl,
          },
        },
      });
    }

    // Fallback to Switch if not already confirmed in DB
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
      humanMessage = "Transaction completed";
      const txHash = result.data?.meta?.hash || validation.data.reference;
      const explorerUrl = result.data?.meta?.explorer_url || null;

      try {
        await updateTransactionByReference(validation.data.reference, {
          status: "CONFIRMED",
          txHash,
          ...(explorerUrl ? { explorerUrl } : {}),
          updatedAt: new Date(),
        });
        invalidateBalanceCache(session.user.id);
      } catch (dbErr: any) {
        console.warn("[Switch Status API] Notice updating transaction status:", dbErr?.message);
      }
    } else if (isFailed) {
      humanMessage = "Transaction failed or expired. Please initiate a new transaction.";
      try {
        await updateTransactionByReference(validation.data.reference, {
          status: "FAILED",
          updatedAt: new Date(),
        });
      } catch (dbErr: any) {
        console.warn("[Switch Status API] Notice updating failed transaction status:", dbErr?.message);
      }
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
    console.error("[Switch Status] ✗ Unhandled error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

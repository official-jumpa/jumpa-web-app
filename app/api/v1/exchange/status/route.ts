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
import { getCentiivRequestStatus } from "@/lib/functions/centiivFunctions";
import { settleOnrampTransferCustom } from "@/lib/chains/onramp-transfer-custom";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";
import { dispatchTransactionEmail } from "@/lib/functions/transactionEmailFunctions";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/exchange/status?reference=...
 * Consolidated status verification for onramp deposits and offramp payouts.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "exchange_status_poll" },
    });
    if (!auth.ok) return auth.response;

    const session = auth.session;
    const reference = req.nextUrl.searchParams.get("reference");
    const validation = switchStatusQuerySchema.safeParse({ reference });
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 400 },
      );
    }

    // Return instantly if already settled in local database
    const existingTx = await findTransactionByReference(
      validation.data.reference,
    );

    const isCustomPendingSettlement =
      existingTx?.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
      existingTx?.rampDetails?.settlementStatus !== "COMPLETED";

    if (
      existingTx &&
      existingTx.status === "CONFIRMED" &&
      !isCustomPendingSettlement
    ) {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        isCompleted: true,
        isAwaiting: false,
        isAwaitingDeposit: false,
        isProcessing: false,
        isFailed: false,
        message: "Transaction completed",
      });
    }

    // Determine provider
    const provider = existingTx?.rampDetails?.provider || "switch";

    let rawStatus = "";
    let txHash: string | undefined;

    if (provider === "centiiv") {
      const centiivRes = await getCentiivRequestStatus(
        validation.data.reference,
      );
      rawStatus = (centiivRes?.status || "").toUpperCase();
      txHash = centiivRes?.txHash;
    } else {
      const result = await SwitchService.getTransactionStatus(
        validation.data.reference,
      );
      if (!result.success) {
        console.error(
          `Status check failed for ${validation.data.reference}: ${formatOneLineError(result.message)}`,
        );
        return NextResponse.json(
          {
            success: false,
            error:
              result.message || "Failed to fetch transaction status from provider",
          },
          { status: 400 },
        );
      }
      rawStatus = (result.data?.status || "").toUpperCase();
      txHash = result.data?.meta?.hash;
    }

    // Normalize status indicators for UI consumers
    const isCompleted = [
      "COMPLETED",
      "SUCCESS",
      "SUCCESSFUL",
      "DELIVERED",
      "SETTLED",
      "FULFILLED",
    ].includes(rawStatus);

    const isAwaitingDeposit = [
      "AWAITING_DEPOSIT",
      "INITIATED",
      "PENDING",
    ].includes(rawStatus);

    const isProcessing = ["PROCESSING", "IN_PROGRESS", "CONFIRMING"].includes(
      rawStatus,
    );

    const isAwaiting = isAwaitingDeposit || isProcessing;

    const isFailed = [
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "REJECTED",
      "REFUNDED",
    ].includes(rawStatus);

    let humanMessage =
      "Awaiting deposit. Waiting for a few seconds before trying again.";
    if (isCompleted) {
      humanMessage = "Transaction completed";
      let explorerUrl: string | null = null;

      // Handle custom onramp settlement if applicable
      if (
        existingTx?.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
        existingTx.toAddress
      ) {
        try {
          const settlementRes = await settleOnrampTransferCustom({
            transactionId: existingTx._id.toString(),
            recipientAddress: existingTx.toAddress,
            targetToken: existingTx.token || "XLM",
            cryptoAmount: existingTx.amount,
            centiivTxHash: txHash,
            expectedUsdcAmount: existingTx.rampDetails?.expectedUsdc,
            userId: session.user.id,
          });

          if (settlementRes.success && settlementRes.txHash) {
            txHash = settlementRes.txHash;
            explorerUrl = `https://stellar.expert/explorer/public/tx/${settlementRes.txHash}`;
          } else if (settlementRes.duplicatePrevented) {
            // Already settling or completed
          } else if (!settlementRes.success) {
            console.error(
              `Custom settlement error: ${formatOneLineError(settlementRes.error)}`,
            );
            return NextResponse.json({
              success: true,
              status: "PROCESSING",
              isCompleted: false,
              isAwaiting: true,
              isAwaitingDeposit: false,
              isProcessing: true,
              isFailed: false,
              message: "Deposit received. Finalizing delivery to your wallet...",
            });
          }
        } catch (settleErr: any) {
          console.error(
            `Error: ${formatOneLineError(settleErr)}`,
          );
        }
      } else {
        try {
          await updateTransactionByReference(validation.data.reference, {
            status: "CONFIRMED",
            txHash,
            ...(explorerUrl ? { explorerUrl } : {}),
            updatedAt: new Date(),
          });
          invalidateBalanceCache(session.user.id);

          if (existingTx) {
            dispatchTransactionEmail(
              existingTx._id,
              existingTx.type === "OFFRAMP" ? "WITHDRAWAL_CONFIRMED" : "DEPOSIT_CONFIRMED",
            ).catch(() => {});
          }
        } catch (dbErr: any) {
          console.warn(
            `DB Error: ${formatOneLineError(dbErr)}`,
          );
        }
      }
    } else if (isFailed) {
      humanMessage =
        "Transaction failed or expired. Please initiate a new transaction.";
      try {
        await updateTransactionByReference(validation.data.reference, {
          status: "FAILED",
          updatedAt: new Date(),
        });

        if (existingTx && existingTx.type === "OFFRAMP") {
          dispatchTransactionEmail(existingTx._id, "WITHDRAWAL_FAILED").catch(() => {});
        }
      } catch (dbErr: any) {
        console.warn(
          `Error: ${formatOneLineError(dbErr)}`,
        );
      }
    } else if (isProcessing) {
      humanMessage = "Deposit received. Processing payout...";
    } else if (isAwaitingDeposit) {
      humanMessage =
        "We haven't seen your transfer yet. Send the exact amount to the account above, then check again.";
    }

    // Minimal client-safe return: Discards raw resultData payload completely!
    return NextResponse.json({
      success: true,
      status: rawStatus,
      isCompleted,
      isAwaiting,
      isAwaitingDeposit,
      isProcessing,
      isFailed,
      message: humanMessage,
    });
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `Error: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Status check timed out. Please try again."
          : "Unable to verify transaction status at this time.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

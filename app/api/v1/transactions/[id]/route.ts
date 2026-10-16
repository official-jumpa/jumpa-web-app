import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  formatTransactionDetail,
  getTransactionById,
} from "@/lib/functions/transactionFunctions";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/transactions/[id]
 * One entry, strictly scoped to its owner, with full detail rows and receipt metadata.
 * Supports prefix-agnostic lookup (e.g. "wnz3888zlmn06aoi" or "tx_wnz3888zlmn06aoi").
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "transactions_detail" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const { id } = await params;
    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    // 8-second execution timeout ceiling
    const fetchTask = async () => {
      const transaction = await getTransactionById(id, session.user.id);
      return transaction;
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transaction detail timeout")), 8000),
    );

    const transaction = await Promise.race([fetchTask(), timeoutPromise]);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction: formatTransactionDetail(transaction),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[transaction-detail] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Transaction request timed out"
          : "Failed to load transaction",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

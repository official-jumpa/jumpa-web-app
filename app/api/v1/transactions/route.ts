import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  queryUserTransactions,
  formatTransactionSummary,
} from "@/lib/functions/transactionFunctions";
import { transactionQuerySchema } from "@/lib/validations/transaction.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/transactions
 * Returns a lean paginated list of user transaction summaries.
 * Detail rows are omitted to reduce payload size by ~75%.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "transactions_list" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const { searchParams } = new URL(req.url);
    const rawParams = {
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      chain: searchParams.get("chain") || undefined,
      network: searchParams.get("network") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      duration: searchParams.get("duration") || undefined,
      card: searchParams.get("card") || undefined,
      token: searchParams.get("token") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const validation = transactionQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { type, status, chain, network, page, limit, duration, card, token, search } =
      validation.data;

    const activePage = page || 1;
    const activeLimit = limit || 20;

    // 8-second execution timeout ceiling
    const fetchTask = async () => {
      const { transactions, total } = await queryUserTransactions({
        userId: session.user.id,
        type,
        status,
        chain,
        network,
        page: activePage,
        limit: activeLimit,
        duration,
        card,
        token,
        search,
      });

      return {
        transactions: transactions.map(formatTransactionSummary),
        pagination: {
          total,
          page: activePage,
          limit: activeLimit,
          hasMore: total > activePage * activeLimit,
        },
      };
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transactions list timeout")), 8000),
    );

    const result = await Promise.race([fetchTask(), timeoutPromise]);

    return NextResponse.json(
      {
        success: true,
        transactions: result.transactions,
        pagination: result.pagination,
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
      `[transactions] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Transactions request timed out"
          : "Failed to fetch transaction history",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

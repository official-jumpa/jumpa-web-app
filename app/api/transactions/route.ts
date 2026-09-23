import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  queryUserTransactions,
  formatDbTransaction,
} from "@/lib/functions/transactionFunctions";
import { transactionQuerySchema } from "@/lib/validations/transaction.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/transactions
 * Returns the user's transaction history ledger with optional filters.
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
    };

    const validation = transactionQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { type, status, chain, network, page, limit, duration, card, token } =
      validation.data;

    const { transactions, total } = await queryUserTransactions({
      userId: session.user.id,
      type,
      status,
      chain,
      network,
      page,
      limit,
      duration,
      card,
      token,
    });

    const activePage = page || 1;
    const activeLimit = limit || 20;

    return NextResponse.json({
      transactions: transactions.map(formatDbTransaction),
      pagination: {
        total,
        page: activePage,
        limit: activeLimit,
        pages: Math.ceil(total / activeLimit),
      },
    });
  } catch (err: any) {
    console.error("[Transactions API Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch transaction history" },
      { status: 500 },
    );
  }
}

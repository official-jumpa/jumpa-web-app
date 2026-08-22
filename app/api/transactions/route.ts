import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

/**
 * GET /api/transactions
 * Returns the user's transaction history ledger with optional filters.
 * Query params: type (TRANSFER, SWAP, ONRAMP, OFFRAMP, FAUCET), status, chain, network, page, limit
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const chain = searchParams.get("chain");
    const network = searchParams.get("network");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { userId: session.user.id };

    if (type) query.type = type.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (chain) query.chain = chain.toLowerCase();
    if (network) query.network = network.toLowerCase();

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
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

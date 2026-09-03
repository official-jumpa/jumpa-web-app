import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

function formatDecimal(val: string | number, maxDecimals = 4): string {
  if (val === undefined || val === null || val === "") return "";
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return String(val);

  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
  });
}


function formatTxDate(dateVal?: Date | string): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday, ${timeStr}`;

  const monthStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${monthStr}, ${timeStr}`;
}

function formatDbTransaction(tx: any) {
  const isIncoming =
    tx.type === "ONRAMP" ||
    tx.type === "FAUCET" ||
    (tx.type === "TRANSFER" &&
      (tx.fromAddress === "SWITCH_NGN_BANK" ||
        tx.fromAddress?.toLowerCase().includes("faucet")));

  const isCard =
    tx.rampDetails?.provider === "mercuryo" ||
    tx.kind === "card";

  const kind: "send" | "receive" | "card" = isCard
    ? "card"
    : isIncoming
      ? "receive"
      : "send";

  // Derive title
  let title = tx.title;
  if (!title) {
    if (tx.type === "SWAP") {
      const fromAmount = tx.swapDetails?.fromAmount
        ? `${formatDecimal(tx.swapDetails.fromAmount, 4)} `
        : "";
      const toAmount = tx.swapDetails?.toAmount
        ? `${formatDecimal(tx.swapDetails.toAmount, 4)} `
        : "";
      title = `Swap to ${toAmount}${tx.swapDetails?.toToken || "Asset"}`;
    } else if (tx.type === "ONRAMP") {
      title = `Deposit ${tx.token}`;
    } else if (tx.type === "OFFRAMP") {
      title = `Withdraw ${tx.token}`;
    } else if (tx.type === "FAUCET") {
      title = `Claim ${tx.token}`;
    } else if (tx.type === "TRANSFER") {
      title = `${isIncoming ? "Received" : "Sent"} ${tx.token}`;
    } else {
      title = tx.token || "Transaction";
    }
  }

  // Derive detail (date only)
  const detail = tx.detail || formatTxDate(tx.createdAt || tx.executedAt);

  // Derive amount with sign and max 4 decimal places
  let rawAmount = String(tx.amount || "").trim();
  let sign = "";
  if (rawAmount.startsWith("+")) {
    sign = "+";
    rawAmount = rawAmount.slice(1).trim();
  } else if (rawAmount.startsWith("-")) {
    sign = "-";
    rawAmount = rawAmount.slice(1).trim();
  } else {
    sign = kind === "receive" ? "+" : "-";
  }

  let tokenPart = tx.token || "";
  if (tokenPart && rawAmount.endsWith(tokenPart)) {
    rawAmount = rawAmount.slice(0, -tokenPart.length).trim();
  }

  const formattedAmountNum = formatDecimal(rawAmount, 4);
  const amount = `${sign}${formattedAmountNum} ${tokenPart}`.trim();

  // Derive status
  const rawStatus = (tx.status || "").toLowerCase();
  const status: "completed" | "pending" | "failed" =
    rawStatus === "failed" || rawStatus === "cancelled"
      ? "failed"
      : rawStatus === "pending"
        ? "pending"
        : "completed";

  return {
    id: tx._id,
    kind,
    title,
    detail,
    amount,
    status,
    chain: tx.chain,
  };
}

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

    if (type) {
      const t = type.toUpperCase();
      if (t === "UTILITY") {
        query.$or = [
          { type: "UTILITY" },
          { "rampDetails.provider": "bills" },
          { token: { $in: ["AIRTIME", "DATA", "ELECTRICITY"] } },
        ];
      } else {
        query.type = t;
      }
    }
    if (status) query.status = status.toUpperCase();
    if (chain) query.chain = chain.toLowerCase();
    if (network) query.network = network.toLowerCase();

    const duration = searchParams.get("duration");
    if (duration) {
      let days = 0;
      if (duration === "7d" || duration.includes("7")) days = 7;
      else if (duration === "30d" || duration.includes("30") || duration.includes("1 Month")) days = 30;
      else if (duration === "90d" || duration.includes("90") || duration.includes("3 Months")) days = 90;

      if (days > 0) {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: threshold };
      }
    }

    const card = searchParams.get("card");
    if (card) {
      const last4 = card.replace(/\D/g, "");
      if (last4) {
        const cardMatch = [
          { "rampDetails.provider": "card" },
          { "rampDetails.bankDetails.accountNumber": { $regex: last4 } },
          { toAddress: { $regex: last4 } },
          { fromAddress: { $regex: last4 } },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: cardMatch }];
          delete query.$or;
        } else {
          query.$or = cardMatch;
        }
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json({
      transactions: transactions.map(formatDbTransaction),
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

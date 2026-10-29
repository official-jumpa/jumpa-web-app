import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { syncWalletInboundDeposits } from "@/lib/functions/depositSyncFunctions";

/**
 * GET or POST /api/cron/check-deposits
 *
 * Runs every 10 minutes to sync on-chain inbound deposits for users who were
 * active in the past 30 minutes across Stellar, Solana, Base, and Ethereum.
 *
 * Query Params / Auth:
 *  - secret: string (optional) or Authorization: Bearer <CRON_SECRET>
 */
async function handleCheckDeposits(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[Deposits Cron] CRON_SECRET is not configured");
      return NextResponse.json(
        { success: false, error: "Cron authentication is unavailable" },
        { status: 503 },
      );
    }
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;

      if (!isBearerValid) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
    }

    await connectDB();

    // Query wallets belonging to users active in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeWallets = await Wallet.find({
      $or: [
        { lastUsedAt: { $gte: thirtyMinutesAgo } },
        { updatedAt: { $gte: thirtyMinutesAgo } },
      ],
    }).lean();

    let totalChecked = 0;
    let totalDepositsFound = 0;
    const details: Array<{
      walletId: string;
      userId: string | null;
      depositsCount: number;
    }> = [];

    for (const wallet of activeWallets) {
      totalChecked++;
      try {
        const deposits = await syncWalletInboundDeposits(wallet as any);
        if (deposits.length > 0) {
          totalDepositsFound += deposits.length;
          details.push({
            walletId: wallet._id,
            userId: wallet.userId,
            depositsCount: deposits.length,
          });
        }
      } catch (walletErr) {
        console.warn(
          `[Deposits Cron] Failed checking wallet ${wallet._id}:`,
          walletErr,
        );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activeWalletsCount: activeWallets.length,
      totalChecked,
      totalDepositsFound,
      details,
    });
  } catch (err: any) {
    console.error("[Deposits Cron] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCheckDeposits(req);
}

export async function POST(req: NextRequest) {
  return handleCheckDeposits(req);
}

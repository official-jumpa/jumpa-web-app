import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { fundTestnetAccount, fetchStellarBalances } from "@/lib/chains/stellar";

/**
 * POST /api/wallet/faucet
 * Body: { chain?: string, address?: string }
 * Funds user's testnet wallet (e.g. Stellar Friendbot with 10,000 XLM).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const chain = (body.chain || "stellar").toLowerCase();

    await connectDB();
    const wallet = await Wallet.findOne({ userId: session.user.id }).lean();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (chain === "stellar" || chain === "xlm") {
      const stellarAddress =
        body.address || wallet.addresses?.xlm || wallet.address;

      if (!stellarAddress || !stellarAddress.startsWith("G")) {
        return NextResponse.json(
          { error: "Valid Stellar public key (G...) required" },
          { status: 400 },
        );
      }

      console.log(`[Faucet API] Requesting Friendbot for ${stellarAddress}...`);
      const result = await fundTestnetAccount(stellarAddress);

      // Fetch fresh testnet balances
      const balances = await fetchStellarBalances(stellarAddress);

      return NextResponse.json({
        success: result.success,
        message: result.message,
        address: stellarAddress,
        balances: balances.testnet,
      });
    }

    return NextResponse.json(
      { error: `Faucet not supported for chain '${chain}'` },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[Faucet API Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fund testnet account" },
      { status: 500 },
    );
  }
}

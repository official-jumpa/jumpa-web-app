import { type NextRequest, NextResponse } from "next/server";
import {
  getOfframpAllowance,
  offrampSenderAddress,
} from "@/lib/chains/offramp-transfer";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/exchange/offramp/allowance?asset=solana:usdc
 * Balance, sponsor fee and max for a cash-out, so the amount screen leaves room for the fee.
 * `data` is null for assets whose cash-outs carry no token fee.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "offramp_allowance" },
    });
    if (!auth.ok) return auth.response;

    let asset = (req.nextUrl.searchParams.get("asset") || "").trim();
    if (asset.toLowerCase().startsWith("eth:")) {
      asset = `ethereum:${asset.slice(4)}`;
    }
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "asset is required" },
        { status: 400 },
      );
    }

    const wallet = await findWalletForUser(auth.userId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 },
      );
    }

    const data = await getOfframpAllowance(
      asset,
      offrampSenderAddress(asset, wallet),
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error(`[OfframpAllowance] ${formatOneLineError(err)}`);
    return NextResponse.json(
      {
        success: false,
        error: "Could not read your balance. Please try again.",
      },
      { status: 502 },
    );
  }
}

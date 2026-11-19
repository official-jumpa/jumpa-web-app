import { type NextRequest, NextResponse } from "next/server";
import { CONTRACT_ADDRESSES } from "@/lib/blockchain";
import { getTronTokenSendFee } from "@/lib/chains/tron/sponsor";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

const TRON_TOKENS = CONTRACT_ADDRESSES.tron.mainnet;
type TronToken = keyof typeof TRON_TOKENS;

/**
 * GET /api/v1/wallet/send/token-fee?chain=tron&asset=USDT&to=T...
 * Live fee for a token send: in the token when Jumpa covers the gas, in TRX when the wallet pays.
 * `data` is null when the wallet holds none of the token.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "send_fee" },
  });
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const asset = (params.get("asset") || "").toUpperCase();
  if (params.get("chain") !== "tron" || !(asset in TRON_TOKENS)) {
    return NextResponse.json(
      { success: false, error: "chain must be tron and asset USDT or USDC" },
      { status: 400 },
    );
  }

  try {
    const wallet = await findWalletForUser(auth.userId);
    const owner = wallet?.addresses?.trx;
    if (!owner) {
      return NextResponse.json({ success: true, data: null });
    }
    const data = await getTronTokenSendFee({
      userId: auth.userId,
      owner,
      token: TRON_TOKENS[asset as TronToken].address,
      symbol: asset,
      to: params.get("to") || undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error(
      `[Wallet] Token fee lookup failed: ${formatOneLineError(err)}`,
    );
    return NextResponse.json(
      { success: false, error: "Couldn't get the network fee right now." },
      { status: 502 },
    );
  }
}

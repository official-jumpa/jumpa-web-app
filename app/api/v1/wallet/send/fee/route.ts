import { type NextRequest, NextResponse } from "next/server";
import { getNativeSendFee } from "@/lib/chains/native-fee";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

const CHAINS = ["base", "eth", "solana", "tron"] as const;
type NativeChain = (typeof CHAINS)[number];

/**
 * GET /api/v1/wallet/send/fee?chain=base|eth|solana|tron
 * Live network fee for sending the chain's own coin, and what MAX leaves behind for it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "send_fee" },
  });
  if (!auth.ok) return auth.response;

  const chain = req.nextUrl.searchParams.get("chain") as NativeChain | null;
  if (!chain || !CHAINS.includes(chain)) {
    return NextResponse.json(
      { success: false, error: "chain must be base, eth, solana or tron" },
      { status: 400 },
    );
  }

  try {
    const { fee, holdback } = await getNativeSendFee(chain);
    return NextResponse.json({ success: true, fee, holdback });
  } catch (err) {
    console.error(
      `[Wallet] Fee lookup failed on ${chain}: ${formatOneLineError(err)}`,
    );
    return NextResponse.json(
      { success: false, error: "Couldn't get the network fee right now." },
      { status: 502 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { faucetRequestSchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { fundTestnetAccount, fetchStellarBalances } from "@/lib/chains/stellar";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

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
    const validation = faucetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const chain = (validation.data.chain || "stellar").toLowerCase();
    const wallet = await findWalletForUser(session.user.id);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (chain === "stellar" || chain === "xlm") {
      const stellarAddress =
        validation.data.address || wallet.addresses?.xlm || wallet.address;

      if (!stellarAddress || !stellarAddress.startsWith("G")) {
        return NextResponse.json(
          { error: "Valid Stellar public key (G...) required" },
          { status: 400 },
        );
      }

      const result = await fundTestnetAccount(stellarAddress);
      const balances = await fetchStellarBalances(stellarAddress);

      if (result.success) {
        logUserActivity({
          userId: session.user.id,
          action: "FAUCET_REQUESTED",
          details: { chain, address: stellarAddress },
          req,
        }).catch((e) => console.error("[Faucet] ActivityLog error:", e));

        createNotification({
          userId: session.user.id,
          tab: "transactions",
          type: "FAUCET_CLAIMED",
          title: "Faucet Claimed",
          body: "Faucet tokens credited to your Stellar wallet",
          metadata: { chain, address: stellarAddress },
          link: "/transactions",
        }).catch((e) => console.error("[Faucet] Notification error:", e));
      }

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

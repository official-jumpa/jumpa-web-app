import { NextRequest, NextResponse } from "next/server";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { enforceRateLimit } from "@/lib/functions/rateLimitFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/wallet
 *
 * Query Parameters:
 * - ?action=new: Generates a fresh 12-word BIP39 mnemonic for onboarding.
 * - ?fields=balance: Returns full multi-chain token balances and total USD value (supports &refresh=true for live RPC queries).
 * - Default: Returns only the user's wallet identity and multi-chain addresses without executing heavy RPC queries.
 */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  // 1. Generate 12-word recovery mnemonic (unauthenticated / onboarding)
  if (action === "new") {
    const rateLimitResponse = await enforceRateLimit(req, {
      tier: "medium",
      action: "wallet_phrase",
    });
    if (rateLimitResponse) return rateLimitResponse;

    const phrase = generateMnemonic(wordlist, 128);
    return NextResponse.json({
      success: true,
      data: { phrase },
    });
  }

  // 2. Explicit Balance Query
  const fields = req.nextUrl.searchParams.get("fields");

  if (fields === "balance") {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "wallet_balance" },
    });
    if (!auth.ok) return auth.response;

    try {
      const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
      const result = await getCachedWalletBalances(
        auth.address || auth.userId,
        undefined,
        forceRefresh,
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Wallet not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error(
        `[Wallet] Failed to fetch balances: ${formatOneLineError(err)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to retrieve wallet balances at this time. Please try again shortly.",
        },
        { status: 500 },
      );
    }
  }

  // 3. Default: Lean Wallet Addresses Only
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "wallet_info" },
  });
  if (!auth.ok) return auth.response;

  const wallet = await findWalletForUser(auth.userId);
  if (!wallet) {
    return NextResponse.json(
      { success: false, error: "Wallet not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      address: wallet.address,
      addresses: wallet.addresses,
    },
  });
}

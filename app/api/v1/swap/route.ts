import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeStellarSwap } from "@/lib/execution/stellar-swap";
import { executeSolanaSwap } from "@/lib/execution/solana-swap";
import { getSwapQuote, buildSwapTransaction } from "@/lib/dex";
import {
  swapQuoteSchema,
  swapExecuteSchema,
  swapBuildSchema,
} from "@/lib/validations/swap.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import {
  assertDailyTransactionLimit, isLimitError,
} from "@/lib/functions/transactionLimitFunctions";

/**
 * POST /api/v1/swap?action=quote|build|execute
 * Swap API route handling DEX quoting, transaction building, and on-chain execution.
 */
export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = (searchParams.get("action") || "quote").toLowerCase();

  // ── 1. QUOTE ACTION ──
  if (action === "quote") {
    try {
      const authResult = await requireActiveUser({
        rateLimit: { tier: "medium", action: "swap_quote" },
      });
      if (!authResult.ok) return authResult.response;

      const body = await req.json().catch(() => ({}));
      const validation = swapQuoteSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), { status: 400 });
      }

      const {
        chain = "stellar",
        assetIn,
        assetOut,
        amount,
        tradeType = "EXACT_IN",
        slippageTolerance = 0.5,
        network = "mainnet",
      } = validation.data;

      const quote = await getSwapQuote({
        chain,
        assetIn,
        assetOut,
        amount,
        tradeType: (tradeType as any) || "EXACT_IN",
        slippageTolerance,
        network,
      });

      return NextResponse.json({
        success: true,
        data: { quote },
      });
    } catch (err: any) {
      console.error(`[Swap] Error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        { success: false, error: err?.message || "Failed to fetch swap quote" },
        { status: 500 },
      );
    }
  }

  // ── 2. BUILD ACTION ──
  if (action === "build") {
    try {
      const authResult = await requireActiveUser({
        rateLimit: { tier: "medium", action: "swap_build" },
      });
      if (!authResult.ok) return authResult.response;

      const body = await req.json().catch(() => ({}));
      const validation = swapBuildSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), { status: 400 });
      }

      const { quote, fromAddress, toAddress, network = "mainnet" } = validation.data;

      const result = await buildSwapTransaction({
        quote,
        fromAddress,
        toAddress: toAddress || fromAddress,
        network,
      });

      return NextResponse.json({
        success: true,
        data: { result },
      });
    } catch (err: any) {
      console.error(`[Swap] Error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        { success: false, error: err?.message || "Failed to build swap transaction" },
        { status: 500 },
      );
    }
  }

  // ── 3. EXECUTE ACTION ──
  if (action === "execute") {
    try {
      const authResult = await requireActiveUser({
        rateLimit: { tier: "high", action: "swap_execute" },
      });
      if (!authResult.ok) return authResult.response;
      const session = authResult.session;

      const body = await req.json().catch(() => ({}));
      const validation = swapExecuteSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), { status: 400 });
      }

      const {
        pin,
        rawQuote,
        chain,
        network = "mainnet",
        fromToken,
        toToken,
        fromAmount,
        toAmount,
      } = validation.data;

      const userId = session.user.id;
      const wallet = await findWalletForUser(userId);

      if (!wallet) {
        return NextResponse.json({ success: false, error: "Wallet not found" }, { status: 404 });
      }

      // Verify PIN
      const pinResult = await verifyWalletPin(wallet, pin, { userId });
      if (!pinResult.ok) {
        return NextResponse.json(
          { success: false, error: pinResult.error },
          { status: pinResult.status },
        );
      }

      // Enforce security transaction limits (discreetly)
      try {
        await assertDailyTransactionLimit({
          userId,
          amount: fromAmount,
          tokenOrCurrency: fromToken,
        });
      } catch (limitErr: any) {
        if (isLimitError(limitErr)) {
          return NextResponse.json(
            { success: false, error: limitErr.message },
            { status: 400 },
          );
        }
        throw limitErr;
      }

      // Detect target chain
      const targetChain = (chain || rawQuote?.chain || (fromToken.toUpperCase() === "SOL" ? "solana" : "stellar")).toLowerCase();

      // Execute swap
      const result = targetChain === "solana" || targetChain === "sol"
        ? await executeSolanaSwap({
          wallet,
          pin,
          rawQuote,
          network,
          fromToken,
          toToken,
          fromAmount,
          toAmount: toAmount || "0",
          userId,
        })
        : await executeStellarSwap({
          wallet,
          pin,
          rawQuote,
          network: network as "testnet" | "mainnet",
          fromToken,
          toToken,
          fromAmount,
          toAmount: toAmount || "0",
          userId,
        });

      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status },
        );
      }

      logUserActivity({
        userId,
        action: "SWAP_EXECUTED",
        details: {
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          txHash: result.txHash,
        },
        req,
      }).catch((e) => console.error(`[Swap] Log error: ${formatOneLineError(e)}`));

      createNotification({
        userId,
        tab: "transactions",
        type: "SWAP_COMPLETED",
        title: "Swap Completed",
        body: `Swapped ${fromAmount} ${fromToken} to ${toAmount} ${toToken}`,
        metadata: {
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          txHash: result.txHash,
        },
        link: "/transactions",
      }).catch((e) => console.error(`[Swap] error: ${formatOneLineError(e)}`));

      // Invalidate balance cache so user immediately receives updated balances
      invalidateBalanceCache(userId);
      if (wallet.address) {
        invalidateBalanceCache(wallet.address);
      }

      return NextResponse.json({
        success: true,
        data: {
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
        },
      });
    } catch (err: any) {
      console.error(`[Swap] Error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        { success: false, error: err?.message || "Failed to execute swap" },
        { status: 500 },
      );
    }
  }

  // ── 4. INVALID ACTION ──
  return NextResponse.json(
    {
      success: false,
      error: `Invalid action "${action}". Please provide a supported action`,
    },
    { status: 400 },
  );
}

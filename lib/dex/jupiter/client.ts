/**
 * lib/dex/jupiter/client.ts
 *
 * Client for Jupiter DEX Aggregator (Swap v2 API: /swap/v2/order and /swap/v2/execute).
 */

import { environment } from "@/lib/environment";
import { CONTRACT_ADDRESSES } from "@/lib/blockchain";
import type { SwapQuote, SwapQuoteRequest } from "../types";

export interface JupiterOrderResponse {
  swapType: string;
  router: string;
  requestId: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct?: string;
  routePlan?: any[];
  feeMint?: string;
  feeBps?: number;
  platformFee?: {
    amount: string;
    feeBps: number;
    feeMint: string;
  };
  taker?: string;
  transaction?: string; // base64 VersionedTransaction
  errorCode?: number;
  errorMessage?: string;
  inUsdValue?: number;
  outUsdValue?: number;
}

export interface JupiterExecuteResponse {
  status: "Success" | "Failed";
  signature?: string;
  code?: number;
  totalInputAmount?: string;
  totalOutputAmount?: string;
  inputAmountResult?: string;
  outputAmountResult?: string;
  error?: string;
}

export function resolveSolanaMint(symbolOrMint: string): { mint: string; decimals: number } {
  const upper = symbolOrMint.trim().toUpperCase();
  const solanaConfig = CONTRACT_ADDRESSES.solana.mainnet;

  if (upper === "SOL" || upper === "WSOL") {
    return solanaConfig.SOL;
  }
  if (upper === "USDC") {
    return solanaConfig.USDC;
  }
  if (upper === "USDT") {
    return solanaConfig.USDT;
  }

  // Fallback if raw mint was provided
  if (symbolOrMint.length >= 32 && symbolOrMint.length <= 44) {
    return { mint: symbolOrMint, decimals: 6 };
  }

  return solanaConfig.SOL;
}

export function toAtomicSolanaUnits(amountStr: string, decimals: number): string {
  const num = Number.parseFloat(amountStr);
  if (Number.isNaN(num) || num <= 0) return "0";
  return Math.round(num * 10 ** decimals).toString();
}

export function fromAtomicSolanaUnits(unitsStr: string | number, decimals: number): string {
  const num = typeof unitsStr === "number" ? unitsStr : Number.parseFloat(unitsStr);
  if (Number.isNaN(num) || num === 0) return "0.00";
  return (num / 10 ** decimals).toFixed(decimals > 6 ? 4 : 2);
}

/**
 * Fetches an optimal live quote from Jupiter Swap v2 (/swap/v2/order).
 */
export async function fetchJupiterQuote(
  params: SwapQuoteRequest & { taker?: string },
): Promise<SwapQuote> {
  const apiKey = environment.JUPITER_API_KEY;
  const baseUrl = environment.JUPITER_BASE_URL;

  const assetInInfo = resolveSolanaMint(params.assetIn);
  const assetOutInfo = resolveSolanaMint(params.assetOut);

  const amountAtomic = toAtomicSolanaUnits(params.amount, assetInInfo.decimals);
  const slippageBps = Math.round((params.slippageTolerance ?? 0.5) * 100);

  const queryParams = new URLSearchParams({
    inputMint: assetInInfo.mint,
    outputMint: assetOutInfo.mint,
    amount: amountAtomic,
    slippageBps: slippageBps.toString(),
  });

  if (params.taker) {
    queryParams.set("taker", params.taker);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(`${baseUrl}/order?${queryParams.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Jupiter quote error (${res.status}): ${errorText || res.statusText}`);
  }

  const order: JupiterOrderResponse = await res.json();

  if (!order.outAmount) {
    throw new Error(order.errorMessage || "Failed to find swap route on Solana");
  }

  const inAmountFormatted = fromAtomicSolanaUnits(order.inAmount || amountAtomic, assetInInfo.decimals);
  const outAmountFormatted = fromAtomicSolanaUnits(order.outAmount, assetOutInfo.decimals);

  const inNum = Number.parseFloat(inAmountFormatted) || 1;
  const outNum = Number.parseFloat(outAmountFormatted) || 0;
  const rateVal = outNum / inNum;
  const rateStr = `1 ${params.assetIn.toUpperCase()} = ${
    rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)
  } ${params.assetOut.toUpperCase()}`;

  const minReceivedUnits = order.otherAmountThreshold || order.outAmount;
  const minReceivedStr = fromAtomicSolanaUnits(minReceivedUnits, assetOutInfo.decimals);

  return {
    chain: "solana",
    protocol: `Jupiter (${order.router || "Metis"})`,
    assetIn: params.assetIn.toUpperCase(),
    assetOut: params.assetOut.toUpperCase(),
    amountIn: params.amount,
    amountOut: outAmountFormatted,
    rate: rateStr,
    priceImpact: order.priceImpactPct ? `${order.priceImpactPct}%` : "< 0.05%",
    minimumReceived: minReceivedStr,
    slippage: `${params.slippageTolerance ?? 0.5}%`,
    estimatedFee: "~0.00005 SOL",
    path: [params.assetIn.toUpperCase(), params.assetOut.toUpperCase()],
    rawQuote: {
      _isJupiter: true,
      requestId: order.requestId,
      router: order.router,
      inputMint: assetInInfo.mint,
      outputMint: assetOutInfo.mint,
      inAmountUnits: order.inAmount || amountAtomic,
      outAmountUnits: order.outAmount,
      slippageBps,
      transaction: order.transaction,
      errorCode: order.errorCode,
      errorMessage: order.errorMessage,
    },
  };
}

/**
 * Submits a signed VersionedTransaction to Jupiter Beam (/swap/v2/execute).
 */
export async function executeJupiterOrder(
  signedTransactionBase64: string,
  requestId: string,
): Promise<JupiterExecuteResponse> {
  const apiKey = environment.JUPITER_API_KEY;
  const baseUrl = environment.JUPITER_BASE_URL;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(`${baseUrl}/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      signedTransaction: signedTransactionBase64,
      requestId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Jupiter execute error (${res.status}): ${errorText || res.statusText}`);
  }

  const result: JupiterExecuteResponse = await res.json();
  return result;
}

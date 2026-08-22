import * as StellarSdk from "@stellar/stellar-sdk";
import { environment } from "@/lib/environment";
import type {
  SwapBuildRequest,
  SwapBuildResult,
  SwapQuote,
  SwapQuoteRequest,
} from "../types";
import {
  SOROSWAP_PROTOCOLS,
  resolveSoroswapContract,
  resolveSoroswapSymbol,
} from "./contracts";

const DECIMALS_FACTOR = 10_000_000;

function toSorobanUnits(amountStr: string): string {
  const num = Number.parseFloat(amountStr);
  if (Number.isNaN(num) || num <= 0) return "10000000"; // default 1 token
  return Math.round(num * DECIMALS_FACTOR).toString();
}

function fromSorobanUnits(unitsStr: string | number): string {
  const num =
    typeof unitsStr === "number" ? unitsStr : Number.parseFloat(unitsStr);
  if (Number.isNaN(num) || num === 0) return "0.00";
  return (num / DECIMALS_FACTOR).toFixed(4);
}

/**
 * Fetches an optimal swap quote strictly from Soroswap REST API (/quote).
 */
export async function fetchSoroswapQuote(
  params: SwapQuoteRequest,
): Promise<SwapQuote> {
  const network = params.network || "testnet";
  const apiKey = environment.SOROSWAP_API_KEY;
  const baseUrl = environment.SOROSWAP_API_URL;

  if (!apiKey) {
    throw new Error(
      "Soroswap API key is missing",
    );
  }

  // Preserve the user-facing symbol labels (e.g. "USDT") for display.
  // Contract addresses are what Soroswap actually needs for routing.
  const symbolIn = params.assetIn.toUpperCase();
  const symbolOut = params.assetOut.toUpperCase();
  const contractIn = resolveSoroswapContract(params.assetIn, network);
  const contractOut = resolveSoroswapContract(params.assetOut, network);

  const amountUnits = toSorobanUnits(params.amount);
  const tradeType = params.tradeType || "EXACT_IN";
  const slippage = params.slippageTolerance ?? 0.5;
  const slippageBps = Math.round(slippage * 100); // 0.5% = 50 bps

  // First try the requested network (e.g. testnet)
  let response = await fetch(`${baseUrl}/quote?network=${network}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      assetIn: contractIn,
      assetOut: contractOut,
      amount: amountUnits,
      tradeType,
      protocols: SOROSWAP_PROTOCOLS,
      slippageBps,
      parts: 10,
    }),
  });


  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Soroswap API error (${response.status}): ${errText || "Quote route not found. Orderbook has insufficient liquidity for this pair."}`,
    );
  }

  const data = await response.json();
  const rawAmountIn = data.amountIn || amountUnits;
  const rawAmountOut = data.amountOut || data.amount || "0";

  const amountInFormatted = fromSorobanUnits(rawAmountIn);
  const amountOutFormatted = fromSorobanUnits(rawAmountOut);

  const inNum = Number.parseFloat(amountInFormatted) || 1;
  const outNum = Number.parseFloat(amountOutFormatted) || 1;
  const rateVal = outNum / inNum;

  const rateStr = `1 ${symbolIn} = ${rateVal < 1 ? rateVal.toFixed(4) : rateVal.toFixed(2)} ${symbolOut}`;
  const minReceived = (outNum * (1 - slippage / 100)).toFixed(4);

  return {
    chain: "stellar",
    protocol: data.platform ? `Soroswap (${data.platform})` : "Soroswap Testnet",
    assetIn: symbolIn,
    assetOut: symbolOut,
    amountIn: amountInFormatted,
    amountOut: amountOutFormatted,
    rate: rateStr,
    priceImpact: data.priceImpactPct ? `${data.priceImpactPct}%` : "< 0.05%",
    minimumReceived: minReceived,
    slippage: `${slippage}%`,
    estimatedFee: "0.00001 XLM",
    path: [symbolIn, symbolOut],
    rawQuote: data,
  };
}

/**
 * Builds an unsigned transaction XDR envelope using Soroswap REST API (/quote/build).
 */
export async function buildSoroswapTransaction(
  req: SwapBuildRequest,
): Promise<SwapBuildResult> {
  const network = req.network || "testnet";
  const apiKey = environment.SOROSWAP_API_KEY;
  const baseUrl = environment.SOROSWAP_API_URL;
  const { quote, fromAddress, toAddress } = req;
  const recipient = toAddress || fromAddress;

  if (!apiKey) {
    throw new Error("Soroswap API key missing");
  }

  const transactionDetails = {
    from: fromAddress,
    to: recipient,
    assetIn: quote.assetIn,
    assetOut: quote.assetOut,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    protocol: quote.protocol,
  };

  const response = await fetch(`${baseUrl}/quote/build?network=${network}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      quote: quote.rawQuote,
      from: fromAddress,
      to: recipient,
    }),
  });

  const buildData = await response.json();
  const xdr =
    buildData.xdr ||
    buildData.transactionXdr ||
    buildData.actionData?.xdr ||
    "";

  if (!xdr) {
    throw new Error(
      `Soroswap build failed (${response.status}): ${JSON.stringify(buildData)}`,
    );
  }

  return {
    chain: "stellar",
    network,
    xdr,
    transactionDetails,
  };
}

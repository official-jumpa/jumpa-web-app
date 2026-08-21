import { buildSoroswapTransaction, fetchSoroswapQuote } from "./soroswap";
import type {
  SwapBuildRequest,
  SwapBuildResult,
  SwapQuote,
  SwapQuoteRequest,
} from "./types";

export * as soroswap from "./soroswap";
export * from "./types";

/**
 * Universal DEX Router: dispatches swap quote requests to the target blockchain DEX aggregator.
 */
export async function getSwapQuote(
  request: SwapQuoteRequest,
): Promise<SwapQuote> {
  const chain = (request.chain || "stellar").toLowerCase();

  switch (chain) {
    case "stellar":
    case "xlm":
      return fetchSoroswapQuote(request);
    default:
      return fetchSoroswapQuote(request);
  }
}

/**
 * Universal DEX Router: dispatches transaction building to the target blockchain DEX aggregator.
 */
export async function buildSwapTransaction(
  request: SwapBuildRequest,
): Promise<SwapBuildResult> {
  const chain = (request.quote?.chain || "stellar").toLowerCase();

  switch (chain) {
    case "stellar":
    case "xlm":
      return buildSoroswapTransaction(request);
    default:
      return buildSoroswapTransaction(request);
  }
}

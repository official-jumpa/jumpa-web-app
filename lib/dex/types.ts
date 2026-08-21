export type SwapTradeType = "EXACT_IN" | "EXACT_OUT";

export interface SwapQuoteRequest {
  chain?: string;
  assetIn: string;
  assetOut: string;
  amount: string;
  tradeType?: SwapTradeType;
  slippageTolerance?: number; // e.g. 0.5 for 0.5%
  network?: "testnet" | "mainnet";
}

export interface SwapQuote {
  chain: string;
  protocol: string;
  assetIn: string;
  assetOut: string;
  amountIn: string;
  amountOut: string;
  rate: string;
  priceImpact: string;
  minimumReceived: string;
  slippage: string;
  estimatedFee: string;
  path: string[];
  rawQuote: Record<string, any>;
}

export interface SwapBuildRequest {
  quote: SwapQuote;
  fromAddress: string;
  toAddress?: string;
  network?: "testnet" | "mainnet";
}

export interface SwapBuildResult {
  chain: string;
  network: string;
  xdr: string;
  transactionDetails: {
    from: string;
    to: string;
    assetIn: string;
    assetOut: string;
    amountIn: string;
    amountOut: string;
    protocol: string;
  };
}

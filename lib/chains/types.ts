export type SupportedChainId =
  | "stellar"
  | "solana"
  | "evm"
  | "base"
  | "bitcoin";

export type NetworkType = "mainnet" | "testnet";

export interface TokenBalance {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  priceUsd: string;
  network?: string;
  isTestnet?: boolean;
}

export interface ChainAccountState {
  address: string;
  network: NetworkType;
  sequence?: string;
  balances: {
    native: string;
    usdc?: string;
    usdt?: string;
    [symbol: string]: string | undefined;
  };
  isActive: boolean;
}

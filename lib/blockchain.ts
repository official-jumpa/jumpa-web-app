/**
 * Centralized Blockchain Registry for Jumpa.
 *
 * Single source of truth for:
 * 1. Token contract addresses & mints (Stellar, Solana, EVM, Base, etc.)
 * 2. Explorer URL generators (tx and address links across all chains)
 * 3. Soroswap DEX contract addresses & symbol resolution
 * 4. EVM chain configurations & Viem public clients
 * 5. Chain registries, asset availability, and AI prompt chain detection
 */

import {
  mainnet,
  sepolia,
  base,
  bsc,
} from "viem/chains";
import { createPublicClient, http, getAddress } from "viem";
import { environment } from "./environment";

// ─── ALL CONTRACT & MINTS ADDRESSES ───────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  stellar: {
    mainnet: {
      USDC: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      USDT: "GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQICXCHAZOQXASNH4GQPMC",
    },
    testnet: {
      USDC: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
  },
  soroswap: {
    testnet: {
      XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      USDC: "CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F",
    },
    mainnet: {
      XLM: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      USDC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    },
  },
  solana: {
    mainnet: {
      USDC: {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
      },
      USDT: {
        mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6,
      },
    },
  },
  base: {
    mainnet: {
      USDC: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
        decimals: 6,
      },
      USDT: {
        address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`,
        decimals: 6,
      },
      cNGN: {
        address: "0x2F7817441fcC56543b5C27C7f28243171887eD60" as `0x${string}`,
        decimals: 6,
      },
    },
  },
  ethereum: {
    mainnet: {
      USDC: {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
        decimals: 6,
      },
      USDT: {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`,
        decimals: 6,
      },
    },
    sepolia: {
      USDC: {
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
        decimals: 6,
      },
      USDT: {
        address: "0xaA8E23Fb1079EA71e0a56F48a2AA51851D8433D0" as `0x${string}`,
        decimals: 6,
      },
    },
  },
} as const;

// ─── EXPLORER URL BUILDERS ────────────────────────────────────────────────

export function getExplorerTxUrl(
  chain: string,
  txHash: string,
  isTestnet?: boolean,
): string {
  const c = chain.toLowerCase().replace(/[\s_-]/g, "");
  const test =
    isTestnet ??
    (c.includes("test") ||
      c.includes("sepolia"));

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/tx/${txHash}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/tx/${txHash}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return `https://${test ? "sepolia." : ""}basescan.org/tx/${txHash}`;
  }
  if (c.includes("bsc") || c.includes("bnb")) {
    return `https://${test ? "testnet." : ""}bscscan.com/tx/${txHash}`;
  }

  // Fallback to Ethereum (Etherscan)
  return `https://${test ? "sepolia." : ""}etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(
  chain: string,
  address: string,
  isTestnet?: boolean,
): string {
  const c = chain.toLowerCase().replace(/[\s_-]/g, "");
  const test =
    isTestnet ??
    (c.includes("test") ||
      c.includes("sepolia"));

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/account/${address}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/account/${address}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return `https://${test ? "sepolia." : ""}basescan.org/address/${address}`;
  }
  if (c.includes("bsc") || c.includes("bnb")) {
    return `https://${test ? "testnet." : ""}bscscan.com/address/${address}`;
  }

  return `https://${test ? "sepolia." : ""}etherscan.io/address/${address}`;
}

// ─── SOROSWAP COMPATIBILITY EXPORTS ───────────────────────────────────────

export const SOROSWAP_TESTNET_CONTRACTS = CONTRACT_ADDRESSES.soroswap.testnet;
export const SOROSWAP_MAINNET_CONTRACTS = CONTRACT_ADDRESSES.soroswap.mainnet;
export const SOROSWAP_PROTOCOLS = ["soroswap", "aqua", "phoenix", "sdex"];

export function resolveSoroswapContract(
  tokenOrAddress: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  const upper = tokenOrAddress.trim().toUpperCase();
  const contracts =
    network === "mainnet"
      ? SOROSWAP_MAINNET_CONTRACTS
      : SOROSWAP_TESTNET_CONTRACTS;

  if (upper === "XLM" || upper === "NATIVE") {
    return contracts.XLM;
  }
  if (upper === "USDC" || upper === "USDT" || upper === "USD") {
    return contracts.USDC;
  }
  if (tokenOrAddress.startsWith("C") && tokenOrAddress.length === 56) {
    return tokenOrAddress;
  }
  return contracts.XLM;
}

export function resolveSoroswapSymbol(
  contractAddress: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  const contracts =
    network === "mainnet"
      ? SOROSWAP_MAINNET_CONTRACTS
      : SOROSWAP_TESTNET_CONTRACTS;

  if (contractAddress.toLowerCase() === contracts.USDC.toLowerCase()) {
    return "USDC";
  }
  if (contractAddress.toLowerCase() === contracts.XLM.toLowerCase()) {
    return "XLM";
  }
  if (contractAddress.toUpperCase() === "NATIVE") return "XLM";
  return contractAddress;
}

// ─── CHAINS & ASSETS REGISTRY ─────────────────────────────────────────────

export type Chain = {
  id: string;
  name: string;
  caption: string;
  address: string;
};

export const CHAINS: Record<string, Chain> = {
  stellar: {
    id: "stellar",
    name: "Stellar",
    caption: "Stellar network (XLM)",
    address: "GDEMO7PLACEHOLDER4JUMPASTELLARADDRESSNOTLIVEYETQZK9",
  },
  solana: {
    id: "solana",
    name: "Solana",
    caption: "Solana network (SPL)",
    address: "SoLDemoPlaceh0lderJumpaAddressNotLiveYet1111",
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    caption: "Ethereum network (ERC-20)",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  base: {
    id: "base",
    name: "Base",
    caption: "Base network (ERC-20)",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  bnb: {
    id: "bnb",
    name: "BNB Smart Chain",
    caption: "BNB Smart Chain (BEP-20)",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  tron: {
    id: "tron",
    name: "Tron",
    caption: "Tron network (TRC-20)",
    address: "TDem0Plac3h0lderJumpaAddressNotLiveYet00",
  },
  ton: {
    id: "ton",
    name: "TON",
    caption: "The Open Network",
    address: "UQDem0placeh0lderJumpaAddressNotLiveYet0000",
  },
};

/** Where each asset can be received, in the order the picker offers them. */
export const ASSET_CHAINS: Record<string, string[]> = {
  USDC: ["stellar", "solana", "base", "ethereum"],
  USDT: ["ethereum", "solana", "bnb"],
  ETH: ["ethereum", "base"],
  XLM: ["stellar"],
  SOL: ["solana"],
  BNB: ["bnb"],
  TRX: ["tron"],
  TON: ["ton"],
};

export function chainsFor(symbol: string): Chain[] {
  const ids = ASSET_CHAINS[symbol.toUpperCase()] ?? ["stellar"];
  return ids.map((id) => CHAINS[id]).filter(Boolean);
}

export function isMultiChain(symbol: string): boolean {
  return chainsFor(symbol).length > 1;
}

export const NETWORKS = ["stellar", "base", "solana", "ethereum"].map((id) => ({
  id,
  label: CHAINS[id]?.name || id,
}));

// ─── AI PROMPT TARGET CHAIN DETECTION ─────────────────────────────────────

export type SupportedChain = "stellar" | "solana" | "evm" | "base";

export function detectTargetChains(prompt: string): SupportedChain[] | undefined {
  const p = prompt.toLowerCase();
  const chains: SupportedChain[] = [];

  if (p.includes("stellar") || p.includes("xlm")) chains.push("stellar");
  if (p.includes("solana") || p.includes("sol")) chains.push("solana");
  if (p.includes("base") && !p.includes("ethereum")) chains.push("base");
  else if (
    p.includes("ethereum") ||
    p.includes("evm") ||
    p.includes("bnb") ||
    p.includes("bsc")
  ) {
    chains.push("evm");
  }

  return chains.length > 0 ? chains : undefined;
}

// ─── EVM CHAINS ───────────────────────────────────────────

export type EvmChainId =
  | "ethereum"
  | "sepolia"
  | "base"
  | "bsc";

export interface EvmChainConfig {
  id: EvmChainId;
  label: string;
  viemChain: any;
  rpcUrl?: string;
  nativeSymbol: string;
  nativeDecimals: number;
  isTestnet: boolean;
  tokens: {
    symbol: string;
    name: string;
    address: `0x${string}`;
    decimals: number;
  }[];
}

export const EVM_CHAINS: EvmChainConfig[] = [
  // --- Ethereum ---
  {
    id: "ethereum",
    label: "Ethereum",
    viemChain: mainnet,
    rpcUrl: "https://eth.drpc.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.address,
        decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDC.decimals,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.address,
        decimals: CONTRACT_ADDRESSES.ethereum.mainnet.USDT.decimals,
      },
    ],
  },
  {
    id: "sepolia",
    label: "Ethereum Sepolia",
    viemChain: sepolia,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Sepolia)",
        address: CONTRACT_ADDRESSES.ethereum.sepolia.USDC.address,
        decimals: CONTRACT_ADDRESSES.ethereum.sepolia.USDC.decimals,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Sepolia)",
        address: CONTRACT_ADDRESSES.ethereum.sepolia.USDT.address,
        decimals: CONTRACT_ADDRESSES.ethereum.sepolia.USDT.decimals,
      },
    ],
  },
  // --- Base ---
  {
    id: "base",
    label: "Base",
    viemChain: base,
    rpcUrl: "https://base.drpc.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: CONTRACT_ADDRESSES.base.mainnet.USDC.address,
        decimals: CONTRACT_ADDRESSES.base.mainnet.USDC.decimals,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: CONTRACT_ADDRESSES.base.mainnet.USDT.address,
        decimals: CONTRACT_ADDRESSES.base.mainnet.USDT.decimals,
      },
    ],
  },
  // --- BSC ---
  {
    id: "bsc",
    label: "BNB Chain",
    viemChain: bsc,
    rpcUrl: "https://bsc.drpc.org",
    nativeSymbol: "BNB",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        decimals: 18,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
      },
    ],
  },
];

for (const chain of EVM_CHAINS) {
  for (const token of chain.tokens) {
    try {
      (token as any).address = getAddress(token.address);
    } catch {
      console.warn(
        `[blockchain] Could not normalize address ${token.address} on ${chain.id}`,
      );
    }
  }
}

const ALCHEMY_PREFIXES: Partial<Record<EvmChainId, string>> = {
  ethereum: "eth-mainnet",
  sepolia: "eth-sepolia",
  base: "base-mainnet",
  bsc: "bnb-mainnet",
};

export function getRpcUrl(chain: EvmChainConfig): string {
  const alchemyKey = environment.ALCHEMY_API_KEY;
  if (alchemyKey) {
    const prefix = ALCHEMY_PREFIXES[chain.id];
    if (prefix) {
      return `https://${prefix}.g.alchemy.com/v2/${alchemyKey}`;
    }
  }
  return chain.rpcUrl || "";
}

export const EVM_CLIENTS: Record<
  EvmChainId,
  ReturnType<typeof createPublicClient>
> = Object.fromEntries(
  EVM_CHAINS.map((chain) => [
    chain.id,
    createPublicClient({
      chain: chain.viemChain,
      transport: http(getRpcUrl(chain)),
    }),
  ]),
) as Record<EvmChainId, ReturnType<typeof createPublicClient>>;

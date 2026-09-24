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
  base,
} from "viem/chains";
import { createPublicClient, http, getAddress } from "viem";
import { environment } from "./environment";

// ─── ALL CONTRACT & MINTS ADDRESSES

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
      ROUTER: "CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD",
      XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      USDC: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    },
    mainnet: {
      ROUTER: "CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH",
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
  },
} as const;

// EXPLORER URL BUILDERS

export function getExplorerTxUrl(
  chain: string,
  txHash: string,
  isTestnet?: boolean,
): string {
  const c = chain.toLowerCase().replace(/[\s_-]/g, "");
  const test = isTestnet ?? c.includes("test");

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/tx/${txHash}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/tx/${txHash}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return `https://basescan.org/tx/${txHash}`;
  }

  // Fallback to Ethereum (Etherscan)
  return `https://etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(
  chain: string,
  address: string,
  isTestnet?: boolean,
): string {
  const c = chain.toLowerCase().replace(/[\s_-]/g, "");
  const test = isTestnet ?? c.includes("test");

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/account/${address}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/account/${address}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return `https://basescan.org/address/${address}`;
  }

  return `https://etherscan.io/address/${address}`;
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
  /** Real wallet address injected at runtime, or "Unavailable" for unsupported chains. */
  address: string;
  /** True when Jumpa does not yet support this chain. No copy button or QR will be shown. */
  unavailable?: boolean;
};

/** Internal shape used only within this file — consumers always receive `Chain`. */
type ChainDef = Chain & { walletKey?: string };

export const CHAINS: Record<string, ChainDef> = {
  stellar: {
    id: "stellar",
    name: "Stellar",
    caption: "Stellar network (XLM)",
    address: "",
    walletKey: "xlm",
  },
  solana: {
    id: "solana",
    name: "Solana",
    caption: "Solana network (SPL)",
    address: "",
    walletKey: "sol",
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    caption: "Ethereum network (ERC-20)",
    address: "",
    walletKey: "eth",
  },
  base: {
    id: "base",
    name: "Base",
    caption: "Base network (ERC-20)",
    address: "",
    walletKey: "base",
  },

  // TODO: Tron support — when ready:
  //   1. Add `trx: string` to IWallet.addresses in models/Wallet.ts + WalletSchema
  //   2. Set walletKey: "trx" below and remove the `unavailable` flag
  //   3. Add Tron address derivation in lib/derive-addresses.ts
  tron: {
    id: "tron",
    name: "Tron",
    caption: "Tron network (TRC-20)",
    address: "Unavailable",
    unavailable: true,
  },

  // TODO: TON support — when ready:
  //   1. Add `ton: string` to IWallet.addresses in models/Wallet.ts + WalletSchema
  //   2. Set walletKey: "ton" below and remove the `unavailable` flag
  //   3. Add TON address derivation in lib/derive-addresses.ts
  ton: {
    id: "ton",
    name: "TON",
    caption: "The Open Network",
    address: "Unavailable",
    unavailable: true,
  },
};

/** Where each asset can be received, in the order the picker offers them. */
export const ASSET_CHAINS: Record<string, string[]> = {
  USDC: ["stellar", "solana", "base", "ethereum"],
  USDT: ["ethereum", "solana"],
  ETH: ["ethereum", "base"],
  XLM: ["stellar"],
  SOL: ["solana"],
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

/**
 * Injects real wallet addresses into a chain list.
 *
 * Supported chains (stellar, solana, ethereum, base) get the user's actual
 * address from their wallet record. Chains marked `unavailable` are passed
 * through unchanged (address stays "Unavailable").
 */
export function resolveChainAddresses(
  addresses: { eth: string; base: string; sol: string; xlm: string },
  chains: Chain[],
): Chain[] {
  return chains.map((chain) => {
    if (chain.unavailable) return chain;
    const key = (CHAINS[chain.id] as ChainDef)?.walletKey as
      | keyof typeof addresses
      | undefined;
    const addr = key ? addresses[key] : undefined;
    return { ...chain, address: addr ?? "Unavailable" };
  });
}


export type SupportedChain = "stellar" | "solana" | "evm" | "base";

export function detectTargetChains(prompt: string): SupportedChain[] | undefined {
  const p = prompt.toLowerCase();
  const chains: SupportedChain[] = [];

  if (p.includes("stellar") || p.includes("xlm")) chains.push("stellar");
  if (p.includes("solana") || p.includes("sol")) chains.push("solana");
  if (p.includes("base") && !p.includes("ethereum")) chains.push("base");
  else if (
    p.includes("ethereum") ||
    p.includes("evm")
  ) {
    chains.push("evm");
  }

  return chains.length > 0 ? chains : undefined;
}

// ─── EVM CHAINS

export type EvmChainId =
  | "ethereum"
  | "base";

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
  base: "base-mainnet",
};

export function getRpcUrl(chainOrId: EvmChainConfig | EvmChainId | string): string {
  const chainId = (typeof chainOrId === "string" ? chainOrId : chainOrId.id).toLowerCase() as EvmChainId;
  const config = typeof chainOrId === "string" ? EVM_CHAINS.find((c) => c.id === chainId) : chainOrId;

  if (chainId === "ethereum") {
    const url = environment.ALCHEMY_ETH_MAINNET_RPC || environment.ALCHEMY_MAINNET_RPC;
    if (url && !url.includes("solana")) return url;
    if (environment.ALCHEMY_API_KEY) {
      return `https://eth-mainnet.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
    }
    return environment.EVM_RPC_URL && !environment.EVM_RPC_URL.includes("solana")
      ? environment.EVM_RPC_URL
      : config?.rpcUrl || "https://eth.drpc.org";
  }

  if (chainId === "base") {
    const url = environment.ALCHEMY_BASE_MAINNET_RPC;
    if (url && !url.includes("solana")) return url;
    if (environment.ALCHEMY_API_KEY) {
      return `https://base-mainnet.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
    }
    return config?.rpcUrl || "https://mainnet.base.org";
  }

  return config?.rpcUrl || "";
}

export function getSolanaRpcUrl(): string {
  const url = environment.SOL_MAINNET || environment.ALCHEMY_SOLANA_MAINNET_RPC;
  if (url && !url.includes("api.mainnet-beta.solana.com")) return url;
  if (environment.ALCHEMY_API_KEY) {
    return `https://solana-mainnet.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
  }
  return environment.NEXT_PUBLIC_SOLANA_RPC || environment.SOL_MAINNET || "https://api.mainnet-beta.solana.com";
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


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
  baseSepolia,
} from "viem/chains";
import { createPublicClient, http, getAddress } from "viem";
import { StrKey } from "@stellar/stellar-sdk";
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
    testnet: {
      USDC: {
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
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
    testnet: {
      USDC: {
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
        decimals: 6,
      },
    },
  },
  cctp: {
    testnet: {
      stellar: {
        domain: 27,
        tokenMessenger: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
        messageTransmitter: "CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY",
        cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
        usdc: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      },
      base: {
        domain: 6,
        tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" as `0x${string}`,
        messageTransmitter: "0x7865FafC2dB2093669d92c0F33ae934b271CE41B" as `0x${string}`,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
        decimals: 6,
      },
      ethereum: {
        domain: 0,
        tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" as `0x${string}`,
        messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as `0x${string}`,
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
        decimals: 6,
      },
    },
    mainnet: {
      stellar: {
        domain: 27,
        tokenMessenger: "CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL",
        messageTransmitter: "CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV",
        cctpForwarder: "CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T",
        usdc: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
      },
      base: {
        domain: 6,
        tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c361A6F41f5e" as `0x${string}`,
        messageTransmitter: "0xAD09780d193884d503182aD4588450C416d6F9D4" as `0x${string}`,
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
        decimals: 6,
      },
      ethereum: {
        domain: 0,
        tokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155" as `0x${string}`,
        messageTransmitter: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81" as `0x${string}`,
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
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
  const test = isTestnet ?? (c.includes("test") || c.includes("sepolia"));

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/tx/${txHash}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/tx/${txHash}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return test
      ? `https://sepolia.basescan.org/tx/${txHash}`
      : `https://basescan.org/tx/${txHash}`;
  }

  // Fallback to Ethereum (Etherscan)
  return test
    ? `https://sepolia.etherscan.io/tx/${txHash}`
    : `https://etherscan.io/tx/${txHash}`;
}

export function getExplorerAddressUrl(
  chain: string,
  address: string,
  isTestnet?: boolean,
): string {
  const c = chain.toLowerCase().replace(/[\s_-]/g, "");
  const test = isTestnet ?? (c.includes("test") || c.includes("sepolia"));

  if (c.includes("stellar") || c === "xlm") {
    return `https://stellar.expert/explorer/${test ? "testnet" : "public"}/account/${address}`;
  }
  if (c.includes("solana") || c === "sol") {
    return `https://solscan.io/account/${address}${test ? "?cluster=devnet" : ""}`;
  }
  if (c.includes("base")) {
    return test
      ? `https://sepolia.basescan.org/address/${address}`
      : `https://basescan.org/address/${address}`;
  }

  return test
    ? `https://sepolia.etherscan.io/address/${address}`
    : `https://etherscan.io/address/${address}`;
}

// ─── CCTP CONFIGURATION & CONVERSIONS ──────────────────────────────────────

export const CCTP_DOMAINS = {
  ethereum: 0,
  optimism: 2,
  arbitrum: 3,
  solana: 5,
  base: 6,
  polygon: 7,
  stellar: 27,
} as const;

export const CIRCLE_IRIS_API = {
  testnet: "https://iris-api-sandbox.circle.com",
  mainnet: "https://iris-api.circle.com",
} as const;

/**
 * Converts a 20-byte EVM address (e.g. 0x123...) to a 32-byte hex string (bytes32)
 * by left-padding with 12 zero bytes, as required by Circle CCTP mint recipient.
 */
export function evmAddressToBytes32(address: string): `0x${string}` {
  const clean = address.toLowerCase().replace(/^0x/, "");
  return `0x${clean.padStart(64, "0")}` as `0x${string}`;
}

/**
 * Extracts a 20-byte EVM address from a 32-byte hex string (bytes32).
 */
export function bytes32ToEvmAddress(bytes32: string): `0x${string}` {
  const clean = bytes32.toLowerCase().replace(/^0x/, "");
  return `0x${clean.slice(-40)}` as `0x${string}`;
}

/**
 * Converts a Stellar G... public key to a 32-byte hex string (0x...)
 * using raw Ed25519 public key bytes, as required by Circle CCTP.
 */
export function stellarAddressToBytes32(stellarAddress: string): `0x${string}` {
  const decoded = StrKey.decodeEd25519PublicKey(stellarAddress);
  return `0x${Buffer.from(decoded).toString("hex")}` as `0x${string}`;
}

/**
 * Converts a 32-byte hex string (0x...) back to a Stellar G... address.
 */
export function bytes32ToStellarAddress(bytes32: string): string {
  const hex = bytes32.replace(/^0x/, "");
  const buf = Buffer.from(hex, "hex");
  return StrKey.encodeEd25519PublicKey(buf);
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
  | "ethereum-sepolia"
  | "sepolia"
  | "base"
  | "base-sepolia";

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
  // --- Ethereum Sepolia (Testnet) ---
  {
    id: "ethereum-sepolia",
    label: "Ethereum Sepolia",
    viemChain: sepolia,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: CONTRACT_ADDRESSES.cctp.testnet.ethereum.usdc,
        decimals: CONTRACT_ADDRESSES.cctp.testnet.ethereum.decimals,
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
  // --- Base Sepolia (Testnet) ---
  {
    id: "base-sepolia",
    label: "Base Sepolia",
    viemChain: baseSepolia,
    rpcUrl: "https://sepolia.base.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: CONTRACT_ADDRESSES.cctp.testnet.base.usdc,
        decimals: CONTRACT_ADDRESSES.cctp.testnet.base.decimals,
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
  "ethereum-sepolia": "eth-sepolia",
  sepolia: "eth-sepolia",
  base: "base-mainnet",
  "base-sepolia": "base-sepolia",
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

  if (chainId === "ethereum-sepolia" || chainId === "sepolia") {
    const url = environment.ALCHEMY_SEPOLIA_RPC;
    if (url && !url.includes("solana")) return url;
    if (environment.ALCHEMY_API_KEY) {
      return `https://eth-sepolia.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
    }
    return config?.rpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";
  }

  if (chainId === "base") {
    const url = environment.ALCHEMY_BASE_MAINNET_RPC;
    if (url && !url.includes("solana")) return url;
    if (environment.ALCHEMY_API_KEY) {
      return `https://base-mainnet.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
    }
    return config?.rpcUrl || "https://mainnet.base.org";
  }

  if (chainId === "base-sepolia") {
    const url = environment.ALCHEMY_BASE_SEPOLIA_RPC;
    if (url && !url.includes("solana")) return url;
    if (environment.ALCHEMY_API_KEY) {
      return `https://base-sepolia.g.alchemy.com/v2/${environment.ALCHEMY_API_KEY}`;
    }
    return config?.rpcUrl || "https://sepolia.base.org";
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


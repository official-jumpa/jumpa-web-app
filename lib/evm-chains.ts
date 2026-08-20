import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  bsc,
  bscTestnet,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  celo,
  celoAlfajores,
} from "viem/chains";
import { createPublicClient, http, getAddress } from "viem";
import { environment } from "./environment";

export type EvmChainId =
  | "ethereum"
  | "sepolia"
  | "base"
  | "baseSepolia"
  | "bsc"
  | "bscTestnet"
  | "polygon"
  | "polygonAmoy"
  | "arbitrum"
  | "arbitrumSepolia"
  | "optimism"
  | "optimismSepolia"
  | "celo"
  | "celoAlfajores";

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
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
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
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Sepolia)",
        address: "0xaA8E23Fb1079EA71e0a56F48a2AA51851D8433D0",
        decimals: 6,
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
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        decimals: 6,
      },
    ],
  },
  {
    id: "baseSepolia",
    label: "Base Sepolia",
    viemChain: baseSepolia,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Base Sepolia)",
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Base Sepolia)",
        address: "0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673",
        decimals: 6,
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
  {
    id: "bscTestnet",
    label: "BSC Testnet",
    viemChain: bscTestnet,
    nativeSymbol: "tBNB",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Testnet)",
        address: "0x64544969ed7ebf5f083679233325356ebe738930",
        decimals: 18,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Testnet)",
        address: "0x337610d27c682E347C9cD60BD4b3b107C913E45f",
        decimals: 18,
      },
    ],
  },
  // --- Polygon ---
  {
    id: "polygon",
    label: "Polygon",
    viemChain: polygon,
    rpcUrl: "https://polygon.drpc.org",
    nativeSymbol: "POL",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
      },
    ],
  },
  {
    id: "polygonAmoy",
    label: "Polygon Amoy",
    viemChain: polygonAmoy,
    nativeSymbol: "POL",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Amoy)",
        address: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Amoy)",
        address: "0x1fdE0e3Cd5765791a35457a473F5a9f14986bCc7",
        decimals: 6,
      },
    ],
  },
  // --- Arbitrum ---
  {
    id: "arbitrum",
    label: "Arbitrum One",
    viemChain: arbitrum,
    rpcUrl: "https://arbitrum.drpc.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
      },
    ],
  },
  {
    id: "arbitrumSepolia",
    label: "Arbitrum Sepolia",
    viemChain: arbitrumSepolia,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Sepolia)",
        address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Sepolia)",
        address: "0x53c9902640F83d3eef4a69E1F0335e2373F2FF87",
        decimals: 6,
      },
    ],
  },
  // --- Optimism ---
  {
    id: "optimism",
    label: "OP Mainnet",
    viemChain: optimism,
    rpcUrl: "https://optimism.drpc.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        decimals: 6,
      },
    ],
  },
  {
    id: "optimismSepolia",
    label: "Optimism Sepolia",
    viemChain: optimismSepolia,
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Sepolia)",
        address: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Sepolia)",
        address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        decimals: 6,
      },
    ],
  },
  // --- Celo ---
  {
    id: "celo",
    label: "Celo",
    viemChain: celo,
    rpcUrl: "https://celo.drpc.org",
    nativeSymbol: "CELO",
    nativeDecimals: 18,
    isTestnet: false,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
        decimals: 6,
      },
    ],
  },
  {
    id: "celoAlfajores",
    label: "Celo Alfajores",
    viemChain: celoAlfajores,
    nativeSymbol: "CELO",
    nativeDecimals: 18,
    isTestnet: true,
    tokens: [
      {
        symbol: "USDC",
        name: "USD Coin (Alfajores)",
        address: "0x2F50D538606Fa9CD6B133C29CF315720A213D824",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD (Alfajores)",
        address: "0xe2e73a1c69ec8f1212c0c9703b6e828484848484",
        decimals: 6,
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
        `[evm-chains] Could not normalize address ${token.address} on ${chain.id}`,
      );
    }
  }
}

const ALCHEMY_PREFIXES: Partial<Record<EvmChainId, string>> = {
  ethereum: "eth-mainnet",
  sepolia: "eth-sepolia",
  base: "base-mainnet",
  baseSepolia: "base-sepolia",
  bsc: "bnb-mainnet",
  bscTestnet: "bnb-testnet",
  polygon: "polygon-mainnet",
  polygonAmoy: "polygon-amoy",
  arbitrum: "arb-mainnet",
  arbitrumSepolia: "arb-sepolia",
  optimism: "opt-mainnet",
  optimismSepolia: "opt-sepolia",
};

function getRpcUrl(chain: EvmChainConfig): string {
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

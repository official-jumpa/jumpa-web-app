/**
 * Chains the wallet can receive on. A token that lives on more than one chain
 * has to ask which network first — funds sent on the wrong one are lost.
 *
 * Addresses are placeholders and say so on their face; the wallet service
 * replaces them once balances are live.
 */

export type Chain = {
  id: string;
  /** Shown in the picker and on the deposit screen. */
  name: string;
  /** What the sender picks in their own wallet. */
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
  polygon: {
    id: "polygon",
    name: "Polygon",
    caption: "Polygon network (ERC-20)",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  bnb: {
    id: "bnb",
    name: "BNB Smart Chain",
    caption: "BNB Smart Chain (BEP-20)",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  celo: {
    id: "celo",
    name: "Celo",
    caption: "Celo network",
    address: "0xDEM0PLACEH0LDER0JUMPA0N0TLIVEYET000000001",
  },
  bitcoin: {
    id: "bitcoin",
    name: "Bitcoin",
    caption: "Bitcoin network",
    address: "bc1qdemoplaceholderjumpaaddressnotliveyet0",
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
  sui: {
    id: "sui",
    name: "Sui",
    caption: "Sui network",
    address: "0xDEM0PLACEH0LDER0JUMPA0SUI0N0TLIVEYET00000",
  },
};

/** Where each asset can be received, in the order the picker offers them. */
const ASSET_CHAINS: Record<string, string[]> = {
  USDC: ["stellar", "solana", "base", "ethereum", "polygon"],
  USDT: ["ethereum", "solana", "polygon", "bnb"],
  ETH: ["ethereum", "base"],
  XLM: ["stellar"],
  SOL: ["solana"],
  BTC: ["bitcoin"],
  BNB: ["bnb"],
  POL: ["polygon"],
  CELO: ["celo"],
  TRX: ["tron"],
  TON: ["ton"],
  SUI: ["sui"],
};

/** Chains an asset can be received on; Stellar is the fallback home chain. */
export function chainsFor(symbol: string): Chain[] {
  const ids = ASSET_CHAINS[symbol.toUpperCase()] ?? ["stellar"];
  return ids.map((id) => CHAINS[id]);
}

/** True when the asset needs the network question before a deposit address. */
export function isMultiChain(symbol: string): boolean {
  return chainsFor(symbol).length > 1;
}

/** Chains a private key can be imported for, in the order the picker offers them. */
export const NETWORKS = ["stellar", "base", "solana", "ethereum"].map((id) => ({
  id,
  label: CHAINS[id].name,
}));

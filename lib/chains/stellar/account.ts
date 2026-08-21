import type { ChainAccountState } from "../types";
import {
  getHorizonServer,
  stellarMainnetServer,
  stellarTestnetServer,
} from "./client";

export interface StellarAssetBalances {
  native: string;
  usdc: string;
  usdt: string;
  [symbol: string]: string;
}

export interface StellarMultiNetBalances {
  mainnet: StellarAssetBalances;
  testnet: StellarAssetBalances;
}

async function safeHorizonCall<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs = 4000,
): Promise<T> {
  try {
    const promise = fn();
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return fallback;
    }
    console.warn("[Stellar Horizon] Call warning:", err?.message || err);
    return fallback;
  }
}

function parseBalancesFromHorizonAccount(
  balances: any[],
): StellarAssetBalances {
  let native = "0.00";
  let usdc = "0.00";
  let usdt = "0.00";

  for (const b of balances || []) {
    if (b.asset_type === "native") {
      native = b.balance || "0.00";
    } else if (b.asset_code === "USDC") {
      usdc = b.balance || "0.00";
    } else if (b.asset_code === "USDT") {
      usdt = b.balance || "0.00";
    }
  }

  return { native, usdc, usdt };
}

/**
 * Fetches real-time Stellar balances for native XLM, USDC, and USDT
 * across both Mainnet and Testnet.
 */
export async function fetchStellarBalances(
  publicKey: string,
): Promise<StellarMultiNetBalances> {
  const fallback: StellarAssetBalances = {
    native: "0.00",
    usdc: "0.00",
    usdt: "0.00",
  };

  if (
    !publicKey ||
    typeof publicKey !== "string" ||
    !publicKey.startsWith("G")
  ) {
    return { mainnet: fallback, testnet: fallback };
  }

  const [mainnet, testnet] = await Promise.all([
    safeHorizonCall(async () => {
      const acc = await stellarMainnetServer.loadAccount(publicKey);
      return parseBalancesFromHorizonAccount(acc.balances);
    }, fallback),
    safeHorizonCall(async () => {
      const acc = await stellarTestnetServer.loadAccount(publicKey);
      return parseBalancesFromHorizonAccount(acc.balances);
    }, fallback),
  ]);

  return { mainnet, testnet };
}

/**
 * Fetches full Horizon account state (sequence number, signers, subentries) on a specific network.
 */
export async function fetchStellarAccountState(
  publicKey: string,
  network: "mainnet" | "testnet" = "testnet",
): Promise<ChainAccountState> {
  const server = getHorizonServer(network);
  try {
    const acc = await server.loadAccount(publicKey);
    const balances = parseBalancesFromHorizonAccount(acc.balances);

    return {
      address: publicKey,
      network,
      sequence: acc.sequence,
      balances,
      isActive: true,
    };
  } catch (err: any) {
    return {
      address: publicKey,
      network,
      balances: { native: "0.00", usdc: "0.00", usdt: "0.00" },
      isActive: false,
    };
  }
}

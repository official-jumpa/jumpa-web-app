import type { ChainAccountState } from "../types";
import {
  STELLAR_MAINNET_HORIZON,
  STELLAR_TESTNET_HORIZON,
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
  timeoutMs = 15000,
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
    if (err?.response?.status === 404 || err?.status === 404) {
      return fallback;
    }
    console.warn("[Stellar Horizon] Call warning:", err?.message || err);
    return fallback;
  }
}

async function loadHorizonAccount(baseUrl: string, publicKey: string) {
  const res = await fetch(`${baseUrl}/accounts/${publicKey}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Horizon error HTTP ${res.status}`);
  return await res.json();
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
  const fallback = { native: "0.00", usdc: "0.00", usdt: "0.00" };

  if (
    !publicKey ||
    typeof publicKey !== "string" ||
    !publicKey.startsWith("G")
  ) {
    return { mainnet: fallback, testnet: fallback };
  }

  const [testnet, mainnet] = await Promise.all([
    safeHorizonCall(async () => {
      const data = await loadHorizonAccount(STELLAR_TESTNET_HORIZON, publicKey);
      if (!data) return fallback;
      return parseBalancesFromHorizonAccount(data.balances);
    }, fallback, 15000),
    safeHorizonCall(async () => {
      const data = await loadHorizonAccount(STELLAR_MAINNET_HORIZON, publicKey);
      if (!data) return fallback;
      return parseBalancesFromHorizonAccount(data.balances);
    }, fallback, 3500),
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

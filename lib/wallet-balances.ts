import { formatEther, formatUnits, erc20Abi } from "viem";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as StellarSdk from "@stellar/stellar-sdk";
import { EVM_CHAINS, EVM_CLIENTS } from "@/lib/evm-chains";
import { environment } from "@/lib/environment";
import { Wallet } from "@/models/Wallet";
import { connectDB } from "@/lib/db";
import { getAssetLogo } from "@/lib/assets";

// Solana Mainnet Connection (Mainnet only)
const solMainnetConnection = new Connection(
  environment.SOL_MAINNET,
  "confirmed",
);

// Stellar Servers (Mainnet & Testnet)
const stellarPublic = new StellarSdk.Horizon.Server(
  environment.STELLAR_MAINNET,
);
const stellarTestnet = new StellarSdk.Horizon.Server(
  environment.STELLAR_TESTNET,
);

export type SupportedChain = "stellar" | "solana" | "evm" | "base" | "bitcoin";

export interface TokenBalanceInfo {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  priceUsd: string;
  network?: string;
  isTestnet?: boolean;
}

export interface WalletBalancesResult {
  address: string;
  addresses: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
    btc: string;
  };
  totalUsd: string;
  tokens: TokenBalanceInfo[];
  summary: Record<string, string>;
  testnetSummary: Record<string, string>;
}

// In-Memory Balance Cache (2-minute TTL)
const balanceCache: Record<
  string,
  { timestamp: number; data: WalletBalancesResult }
> = {};
const CACHE_TTL = 2 * 60 * 1000;

interface CoinGeckoInfo {
  priceUsd: string;
  icon: string;
}

const coinGeckoCache: Record<string, CoinGeckoInfo> = {
  BTC: { priceUsd: "65000.00", icon: "/images/home/coin-bitcoin.svg" },
  SOL: { priceUsd: "150.00", icon: "/images/home/coin-generic.svg" },
  XLM: { priceUsd: "0.12", icon: "/images/home/coin-generic.svg" },
  ETH: { priceUsd: "3540.21", icon: "/images/home/coin-generic.svg" },
  BNB: { priceUsd: "580.00", icon: "/images/home/coin-generic.svg" },
  POL: { priceUsd: "0.55", icon: "/images/home/coin-generic.svg" },
  CELO: { priceUsd: "0.65", icon: "/images/home/coin-generic.svg" },
  USDC: { priceUsd: "1.00", icon: "/images/home/usdcImg.png" },
  USDT: { priceUsd: "1.00", icon: "/images/home/coin-generic.svg" },
};

let pricesLastFetched = 0;
const PRICES_CACHE_TTL = 5 * 60 * 1000;

async function updateCoinGeckoData() {
  const now = Date.now();
  if (now - pricesLastFetched < PRICES_CACHE_TTL) {
    return;
  }

  try {
    const ids =
      "bitcoin,ethereum,binancecoin,polygon-ecosystem,celo,solana,stellar,usd-coin,tether";
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (Array.isArray(data)) {
      const map: Record<string, string> = {
        bitcoin: "BTC",
        ethereum: "ETH",
        binancecoin: "BNB",
        "polygon-ecosystem": "POL",
        celo: "CELO",
        solana: "SOL",
        stellar: "XLM",
        "usd-coin": "USDC",
        tether: "USDT",
      };

      for (const coin of data) {
        const symbol = map[coin.id];
        if (symbol) {
          coinGeckoCache[symbol] = {
            priceUsd:
              coin.current_price?.toString() || coinGeckoCache[symbol].priceUsd,
            icon: coin.image || coinGeckoCache[symbol].icon,
          };
        }
      }
      pricesLastFetched = now;
      console.log("[Balance Service] CoinGecko price cache updated.");
    }
  } catch (err) {
    console.warn(
      "[Balance Service] CoinGecko Markets API failed, using fallback values:",
      err,
    );
  }
}

async function safeFetchBalance<T>(
  fetchFn: () => Promise<T>,
  label: string,
  fallback: T,
): Promise<T> {
  const timeoutMs = 3500;
  try {
    const promise = fetchFn();
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on ${label}`)), timeoutMs),
      ),
    ]);
  } catch (err) {
    console.warn(
      `[Balance Service] Fallback for [${label}]:`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

export async function fetchWalletBalances(
  addresses: {
    eth: string;
    base: string;
    sol: string;
    xlm: string;
    btc: string;
  },
  chains?: SupportedChain[],
): Promise<WalletBalancesResult> {
  const shouldFetchAll = !chains || chains.length === 0;
  const fetchStellar = shouldFetchAll || chains?.includes("stellar");
  const fetchSolana = shouldFetchAll || chains?.includes("solana");
  const fetchBaseOnly = chains?.includes("base") && !chains?.includes("evm");
  const fetchEvm = shouldFetchAll || chains?.includes("evm") || fetchBaseOnly;
  const fetchBitcoin = shouldFetchAll || chains?.includes("bitcoin");

  console.log(
    `[Balance Service] Fetching balances for chains: [${
      shouldFetchAll ? "ALL" : chains?.join(", ")
    }] (Testnet: Stellar only)`,
  );

  const { eth: ethAddr, sol: solAddr, xlm: xlmAddr, btc: btcAddr } = addresses;
  await updateCoinGeckoData();

  // 1. EVM Chains (Mainnet only)
  let evmResults: any[] = [];
  if (fetchEvm) {
    const mainnetChains = EVM_CHAINS.filter((c) => !c.isTestnet);
    const filteredChains = fetchBaseOnly
      ? mainnetChains.filter((c) => c.id === "base")
      : mainnetChains;

    const evmQueries = filteredChains.map(async (chain) => {
      const client = EVM_CLIENTS[chain.id];
      const evmAddress = ethAddr as `0x${string}`;

      const result = await safeFetchBalance(
        async () => {
          const [nativeWei, tokenResults] = await Promise.all([
            client.getBalance({ address: evmAddress }),
            chain.tokens.length > 0
              ? client.multicall({
                  allowFailure: true,
                  contracts: chain.tokens.map((token) => ({
                    address: token.address as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "balanceOf" as const,
                    args: [evmAddress] as [`0x${string}`],
                  })),
                })
              : Promise.resolve(
                  [] as { status: "success" | "failure"; result?: unknown }[],
                ),
          ]);

          const nativeBal = formatEther(nativeWei);
          const tokenBals = tokenResults.map((res, idx) =>
            res.status === "success"
              ? formatUnits(res.result as bigint, chain.tokens[idx].decimals)
              : "0.00",
          );

          return { nativeBal, tokenBals };
        },
        `${chain.label} balance`,
        { nativeBal: "0.00", tokenBals: chain.tokens.map(() => "0.00") },
      );

      return {
        chain,
        nativeBal: result.nativeBal,
        tokens: chain.tokens.map((token, idx) => ({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: result.tokenBals[idx],
          decimals: token.decimals,
        })),
      };
    });

    evmResults = await Promise.all(evmQueries);
  }

  // 2. Solana (Mainnet only)
  let solMainnetBal = "0.00";
  if (fetchSolana && solAddr) {
    solMainnetBal = await safeFetchBalance(
      () =>
        solMainnetConnection
          .getBalance(new PublicKey(solAddr))
          .then((b) => (b / LAMPORTS_PER_SOL).toFixed(4)),
      "Solana Mainnet",
      "0.00",
    );
  }

  // 3. Stellar (Mainnet & Testnet)
  let xlmMainnet = { native: "0.00", usdc: "0.00", usdt: "0.00" };
  let xlmTestnet = { native: "0.00", usdc: "0.00", usdt: "0.00" };
  if (fetchStellar && xlmAddr) {
    const [mainnet, testnet] = await Promise.all([
      safeFetchBalance(
        () =>
          stellarPublic
            .loadAccount(xlmAddr)
            .then((acc) => {
              const native =
                acc.balances.find((b: any) => b.asset_type === "native")
                  ?.balance || "0.00";
              const usdc =
                acc.balances.find((b: any) => b.asset_code === "USDC")
                  ?.balance || "0.00";
              const usdt =
                acc.balances.find((b: any) => b.asset_code === "USDT")
                  ?.balance || "0.00";
              return { native, usdc, usdt };
            })
            .catch((err) => {
              if (err?.response?.status === 404) {
                return { native: "0.00", usdc: "0.00", usdt: "0.00" };
              }
              throw err;
            }),
        "Stellar Mainnet",
        { native: "0.00", usdc: "0.00", usdt: "0.00" },
      ),
      safeFetchBalance(
        () =>
          stellarTestnet
            .loadAccount(xlmAddr)
            .then((acc) => {
              const native =
                acc.balances.find((b: any) => b.asset_type === "native")
                  ?.balance || "0.00";
              const usdc =
                acc.balances.find((b: any) => b.asset_code === "USDC")
                  ?.balance || "0.00";
              const usdt =
                acc.balances.find((b: any) => b.asset_code === "USDT")
                  ?.balance || "0.00";
              return { native, usdc, usdt };
            })
            .catch((err) => {
              if (err?.response?.status === 404) {
                return { native: "0.00", usdc: "0.00", usdt: "0.00" };
              }
              throw err;
            }),
        "Stellar Testnet",
        { native: "0.00", usdc: "0.00", usdt: "0.00" },
      ),
    ]);
    xlmMainnet = mainnet;
    xlmTestnet = testnet;
  }

  // 4. Bitcoin (Mainnet only)
  let btcBal = "0.0000";
  if (fetchBitcoin && btcAddr) {
    btcBal = await safeFetchBalance(
      async () => {
        const ALCHEMY_KEY = environment.ALCHEMY_API_KEY || "demo";
        const res = await fetch(
          `https://bitcoin-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "bb_getaddress",
              params: [btcAddr, { details: "basic" }],
            }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const satoshis = parseInt(json.result?.balance || "0", 10);
        return (satoshis / 100000000).toFixed(8);
      },
      "Bitcoin Mainnet",
      "0.00000000",
    );
  }

  const btcCached = coinGeckoCache.BTC;
  const solCached = coinGeckoCache.SOL;
  const xlmCached = coinGeckoCache.XLM;
  const usdcCached = coinGeckoCache.USDC;
  const usdtCached = coinGeckoCache.USDT;

  const tokens: TokenBalanceInfo[] = [];
  const summary: Record<string, string> = {};
  const testnetSummary: Record<string, string> = {};

  if (fetchStellar) {
    tokens.push({
      symbol: "XLM",
      name: "Stellar",
      icon: xlmCached.icon,
      balance: xlmMainnet.native,
      priceUsd: xlmCached.priceUsd,
      network: "Stellar Mainnet",
      isTestnet: false,
    });
    tokens.push({
      symbol: "USDC",
      name: "USD Coin (Stellar)",
      icon: usdcCached.icon,
      balance: xlmMainnet.usdc,
      priceUsd: usdcCached.priceUsd,
      network: "Stellar Mainnet",
      isTestnet: false,
    });
    tokens.push({
      symbol: "USDT",
      name: "Tether USD (Stellar)",
      icon: usdtCached.icon,
      balance: xlmMainnet.usdt,
      priceUsd: usdtCached.priceUsd,
      network: "Stellar Mainnet",
      isTestnet: false,
    });

    summary.XLM = `${xlmMainnet.native} XLM`;
    summary.USDC = `${xlmMainnet.usdc} USDC`;
    summary.USDT = `${xlmMainnet.usdt} USDT`;

    testnetSummary["Stellar Testnet (XLM)"] = `${xlmTestnet.native} XLM`;
    testnetSummary["Stellar Testnet (USDC)"] = `${xlmTestnet.usdc} USDC`;
    testnetSummary["Stellar Testnet (USDT)"] = `${xlmTestnet.usdt} USDT`;
  }

  if (fetchSolana) {
    tokens.push({
      symbol: "SOL",
      name: "Solana",
      icon: solCached.icon,
      balance: solMainnetBal,
      priceUsd: solCached.priceUsd,
      network: "Solana Mainnet",
      isTestnet: false,
    });
    summary.SOL = `${solMainnetBal} SOL`;
  }

  if (fetchBitcoin) {
    tokens.push({
      symbol: "BTC",
      name: "Bitcoin",
      icon: btcCached.icon,
      balance: btcBal,
      priceUsd: btcCached.priceUsd,
      network: "Bitcoin",
      isTestnet: false,
    });
    summary.BTC = `${btcBal} BTC`;
  }

  if (fetchEvm) {
    evmResults.forEach((res) => {
      const nativeInfo = coinGeckoCache[res.chain.nativeSymbol] || {
        priceUsd: "0.00",
        icon: "/images/home/coin-generic.svg",
      };
      tokens.push({
        symbol: res.chain.nativeSymbol,
        name: res.chain.label,
        icon: nativeInfo.icon,
        balance: res.nativeBal,
        priceUsd: nativeInfo.priceUsd,
        network: res.chain.label,
        isTestnet: false,
      });

      // Add mainnet EVM native to summary
      summary[`${res.chain.label} (${res.chain.nativeSymbol})`] =
        `${res.nativeBal} ${res.chain.nativeSymbol}`;

      res.tokens.forEach((t: any) => {
        const tokenInfo = coinGeckoCache[t.symbol] || {
          priceUsd: "1.00",
          icon: getAssetLogo(t.symbol),
        };
        tokens.push({
          symbol: t.symbol,
          name: `${t.name} (${res.chain.label})`,
          icon: tokenInfo.icon,
          balance: t.balance,
          priceUsd: tokenInfo.priceUsd,
          network: res.chain.label,
          isTestnet: false,
        });

        // Add tracked token to summary
        summary[`${res.chain.label} (${t.symbol})`] =
          `${t.balance} ${t.symbol}`;
      });
    });
  }

  const totalUsd = tokens
    .filter((t) => !t.isTestnet)
    .reduce((sum, t) => {
      const bal = parseFloat(t.balance) || 0;
      const price = parseFloat(t.priceUsd) || 0;
      return sum + bal * price;
    }, 0)
    .toFixed(2);

  summary.totalUsd = `$${totalUsd}`;

  console.log(
    `[Balance Service] Returned balances for [${chains?.join(", ") || "ALL"}]:`,
    {
      summary,
      testnetSummary,
    },
  );

  return {
    address: ethAddr,
    addresses,
    totalUsd,
    tokens,
    summary,
    testnetSummary,
  };
}

/**
 * Retrieves cached balances or fetches on-chain balances for specific requested chains.
 */
export async function getCachedWalletBalances(
  userIdOrAddress: string,
  chains?: SupportedChain[],
): Promise<WalletBalancesResult | null> {
  const now = Date.now();
  const cached = balanceCache[userIdOrAddress.toLowerCase()];

  // If we have full cached data and it's fresh, return immediately
  if (cached && now - cached.timestamp < CACHE_TTL) {
    const ageSec = Math.round((now - cached.timestamp) / 1000);
    console.log(
      `[Balance Service] Cache HIT for "${userIdOrAddress}" (cached ${ageSec}s ago, TTL: ${Math.round((CACHE_TTL - (now - cached.timestamp)) / 1000)}s remaining)`,
    );
    return cached.data;
  }

  console.log(
    `[Balance Service] Fetching on-demand balances for "${userIdOrAddress}" on chains: [${chains?.join(", ") || "ALL"}]...`,
  );

  await connectDB();
  const wallet = await Wallet.findOne({
    $or: [
      { userId: userIdOrAddress },
      { address: userIdOrAddress.toLowerCase() },
    ],
  }).lean();

  if (!wallet) {
    console.warn(
      `[Balance Service] No wallet document found for userIdOrAddress: "${userIdOrAddress}"`,
    );
    return null;
  }

  try {
    const result = await fetchWalletBalances(wallet.addresses, chains);
    // If all chains were fetched, update the global cache
    if (!chains || chains.length === 0) {
      if (wallet.userId) {
        balanceCache[wallet.userId.toLowerCase()] = {
          timestamp: now,
          data: result,
        };
      }
      if (wallet.address) {
        balanceCache[wallet.address.toLowerCase()] = {
          timestamp: now,
          data: result,
        };
      }
    }
    return result;
  } catch (err) {
    console.error("[Balance Service] Error fetching balances:", err);
    if (cached) return cached.data;
    return null;
  }
}

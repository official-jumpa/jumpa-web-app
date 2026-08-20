import { NextRequest, NextResponse } from "next/server";
import { formatEther, formatUnits, erc20Abi } from "viem";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as StellarSdk from "@stellar/stellar-sdk";
import { withAuth } from "@/lib/withAuth";
import { Wallet } from "@/models/Wallet";
import { connectDB } from "@/lib/db";
import { EVM_CHAINS, EVM_CLIENTS } from "@/lib/evm-chains";
import { environment } from "@/lib/environment";

// Solana Connections
const solMainnetConnection = new Connection(
  environment.SOL_MAINNET,
  "confirmed",
);
const solDevnetConnection = new Connection(environment.SOL_DEVNET, "confirmed");

// Stellar Servers
const stellarPublic = new StellarSdk.Horizon.Server(
  environment.STELLAR_MAINNET,
);
const stellarTestnet = new StellarSdk.Horizon.Server(
  environment.STELLAR_TESTNET,
);

const balanceCache: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

interface CoinGeckoInfo {
  priceUsd: string;
  icon: string;
}

// Fallback values if CoinGecko request fails
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
    }
  } catch (err) {
    console.warn(
      "[Balance API] CoinGecko Markets API failed, using fallback values:",
      err,
    );
  }
}

async function safeFetchBalance<T>(
  fetchFn: () => Promise<T>,
  label: string,
  fallback: T,
): Promise<T> {
  const timeoutMs = 4000;
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
      `[Balance API] Fallback [${label}]:`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

async function fetchWalletBalances(addresses: {
  eth: string;
  base: string;
  sol: string;
  xlm: string;
  btc: string;
}) {
  const { eth: ethAddr, sol: solAddr, xlm: xlmAddr, btc: btcAddr } = addresses;
  await updateCoinGeckoData();

  // 1. Query EVM Chains
  const evmQueries = EVM_CHAINS.filter((c) => !c.isTestnet).map(
    async (chain) => {
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
    },
  );

  const evmResults = await Promise.all(evmQueries);

  // 2. Solana Balances
  const solPromise = solAddr
    ? safeFetchBalance(
        () =>
          solMainnetConnection
            .getBalance(new PublicKey(solAddr))
            .then((b) => (b / LAMPORTS_PER_SOL).toFixed(4)),
        "Solana Mainnet",
        "0.00",
      )
    : Promise.resolve("0.00");

  // 3. Stellar Balances
  const stellarAccountPromise = xlmAddr
    ? safeFetchBalance(
        () =>
          stellarPublic
            .loadAccount(xlmAddr)
            .then((acc) => {
              const native =
                acc.balances.find((b: any) => b.asset_type === "native")
                  ?.balance || "0.00";
              return { native };
            })
            .catch((err) => {
              if (err?.response?.status === 404) return { native: "0.00" };
              throw err;
            }),
        "Stellar Mainnet",
        { native: "0.00" },
      )
    : Promise.resolve({ native: "0.00" });

  // 4. Bitcoin Balances
  const btcPromise = btcAddr
    ? safeFetchBalance(
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
      )
    : Promise.resolve("0.0000");

  const [solBal, xlmInfo, btcBal] = await Promise.all([
    solPromise,
    stellarAccountPromise,
    btcPromise,
  ]);

  const btcCached = coinGeckoCache.BTC;
  const solCached = coinGeckoCache.SOL;
  const xlmCached = coinGeckoCache.XLM;

  const standardNames: Record<string, string> = {
    BTC: "Bitcoin",
    SOL: "Solana",
    XLM: "Stellar",
    ETH: "Ethereum",
    BNB: "BNB",
    POL: "Polygon",
    CELO: "Celo",
    USDC: "USD Coin",
    USDT: "Tether USD",
  };

  const aggregated: Record<
    string,
    {
      symbol: string;
      name: string;
      icon: string;
      balance: number;
      priceUsd: string;
    }
  > = {};

  function addBalance(
    symbol: string,
    fallbackName: string,
    icon: string,
    rawBalance: string,
    priceUsd: string,
  ) {
    const val = parseFloat(rawBalance) || 0;
    const name = standardNames[symbol] || fallbackName;
    if (!aggregated[symbol]) {
      aggregated[symbol] = {
        symbol,
        name,
        icon,
        balance: 0,
        priceUsd,
      };
    }
    aggregated[symbol].balance += val;
  }

  // 1. Add non-EVM native balances
  addBalance("BTC", "Bitcoin", btcCached.icon, btcBal, btcCached.priceUsd);
  addBalance("SOL", "Solana", solCached.icon, solBal, solCached.priceUsd);
  addBalance(
    "XLM",
    "Stellar",
    xlmCached.icon,
    xlmInfo.native,
    xlmCached.priceUsd,
  );

  // 2. Add EVM balances
  evmResults.forEach((res) => {
    const nativeInfo = coinGeckoCache[res.chain.nativeSymbol] || {
      priceUsd: "0.00",
      icon: "/images/home/coin-generic.svg",
    };
    addBalance(
      res.chain.nativeSymbol,
      res.chain.label,
      nativeInfo.icon,
      res.nativeBal,
      nativeInfo.priceUsd,
    );

    res.tokens.forEach((t) => {
      const tokenInfo = coinGeckoCache[t.symbol] || {
        priceUsd: "1.00",
        icon: "/images/home/coin-generic.svg",
      };
      addBalance(
        t.symbol,
        t.name,
        tokenInfo.icon,
        t.balance,
        tokenInfo.priceUsd,
      );
    });
  });

  const tokens = Object.values(aggregated).map((item) => {
    let decimals = 2;
    if (item.symbol === "BTC") decimals = 8;
    else if (item.symbol === "SOL") decimals = 4;
    else if (item.symbol === "ETH") decimals = 6;

    return {
      symbol: item.symbol,
      name: item.name,
      icon: item.icon,
      balance: item.balance.toFixed(decimals),
      priceUsd: item.priceUsd,
    };
  });

  const totalUsd = tokens
    .reduce((sum, t) => {
      const bal = parseFloat(t.balance) || 0;
      const price = parseFloat(t.priceUsd) || 0;
      return sum + bal * price;
    }, 0)
    .toFixed(2);

  return {
    address: ethAddr,
    addresses,
    totalUsd,
    tokens,
  };
}

export const GET = withAuth(async (req, { address, userId }) => {
  const now = Date.now();
  const cached = balanceCache[address];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    await connectDB();
    const wallet = await Wallet.findOne({ address: address.toLowerCase() });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const result = await fetchWalletBalances(wallet.addresses);
    balanceCache[address] = { timestamp: now, data: result };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Balance API] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 },
    );
  }
});

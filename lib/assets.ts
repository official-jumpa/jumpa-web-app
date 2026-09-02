import type { Asset } from "@/lib/wallet";

/**
 * Helper to resolve asset/coin logo URLs across the application
 */
/**
 * Official brand marks, kept as one map so a symbol can never resolve to a
 * glyph that disagrees with it. Every logo is a full-bleed 128px circle.
 */
const LOGOS: Record<string, string> = {
  XLM: "/coins/xlm.webp",
  USDC: "/coins/usdc.webp",
  USDT: "/coins/usdt.webp",
  SOL: "/coins/sol.webp",
  BTC: "/coins/btc.webp",
  BNB: "/coins/bnb.webp",
  POL: "/coins/pol.webp",
  CELO: "/coins/celo.webp",
  ETH: "/coins/eth.webp",
  BASE: "/coins/base.webp",
  TRX: "/coins/trx.webp",
  TON: "/coins/ton.webp",
  SUI: "/coins/sui.webp",
};

/** Longest alias first — "STELLAR" must beat a bare "SOL" inside it. */
const ALIASES: [string, string][] = [
  ["STELLAR", "XLM"],
  ["TETHER", "USDT"],
  ["BITCOIN", "BTC"],
  ["ETHEREUM", "ETH"],
  ["POLYGON", "POL"],
  ["BINANCE", "BNB"],
  ["SOLANA", "SOL"],
  ["TONCOIN", "TON"],
  ["TRON", "TRX"],
  ["MATIC", "POL"],
  ["USDC", "USDC"],
  ["USDT", "USDT"],
  ["BASE", "BASE"],
  ["CELO", "CELO"],
  ["XLM", "XLM"],
  ["BTC", "BTC"],
  ["BNB", "BNB"],
  ["POL", "POL"],
  ["SOL", "SOL"],
  ["ETH", "ETH"],
  ["TRX", "TRX"],
  ["TON", "TON"],
  ["SUI", "SUI"],
  ["USD", "USDC"],
];

/** Resolve an asset, chain or network name to its logo. */
export function getAssetLogo(symbol = ""): string {
  const value = symbol.toUpperCase().trim();
  const direct = LOGOS[value];
  if (direct) return direct;

  for (const [needle, key] of ALIASES) {
    if (value.includes(needle)) return LOGOS[key];
  }
  return "/images/home/coin-generic.svg";
}

/**
 * Normalizes multi-chain tokens into a unified list of unique assets with combined balances.
 */
export function unifyTokens(tokens: any[]): Asset[] {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];

  const map = new Map<
    string,
    {
      symbol: string;
      name: string;
      icon: string;
      totalAmount: number;
      totalUsd: number;
    }
  >();

  const getUnifiedMeta = (rawSymbol = ""): { symbol: string; name: string } => {
    const s = rawSymbol.toUpperCase().trim();
    if (s.includes("USDC")) return { symbol: "USDC", name: "USD Coin" };
    if (s.includes("USDT") || s.includes("TETHER"))
      return { symbol: "USDT", name: "Tether" };
    if (s.includes("ETH") || s.includes("WETH"))
      return { symbol: "ETH", name: "Ethereum" };
    if (s.includes("SOL")) return { symbol: "SOL", name: "Solana" };
    if (s.includes("XLM") || s.includes("STELLAR"))
      return { symbol: "XLM", name: "Stellar" };
    if (s.includes("BTC") || s.includes("BITCOIN"))
      return { symbol: "BTC", name: "Bitcoin" };
    if (s.includes("BNB")) return { symbol: "BNB", name: "BNB" };
    if (s.includes("POL") || s.includes("MATIC"))
      return { symbol: "POL", name: "Polygon" };
    if (s.includes("CELO")) return { symbol: "CELO", name: "Celo" };
    return { symbol: s, name: s };
  };

  for (const t of tokens) {
    const { symbol, name } = getUnifiedMeta(t.symbol);
    const amount = parseFloat(t.balance) || 0;
    const price = parseFloat(t.priceUsd) || 0;
    const usdVal = amount * price;

    const existing = map.get(symbol);
    if (existing) {
      existing.totalAmount += amount;
      existing.totalUsd += usdVal;
    } else {
      map.set(symbol, {
        symbol,
        name: t.name && !t.name.includes("(") ? t.name : name,
        icon: t.icon || getAssetLogo(symbol),
        totalAmount: amount,
        totalUsd: usdVal,
      });
    }
  }

  return Array.from(map.values()).map((item) => {
    const formattedAmount = item.totalAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    const formattedUsd = item.totalUsd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      symbol: item.symbol,
      name: item.name,
      icon: item.icon,
      balance: `$${formattedUsd}`,
      change: `${formattedAmount} ${item.symbol}`,
    };
  });
}

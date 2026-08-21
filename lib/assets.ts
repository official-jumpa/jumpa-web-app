import type { Asset } from "@/lib/wallet";

/**
 * Helper to resolve asset/coin logo URLs across the application
 */
export function getAssetLogo(symbol = ""): string {
  const s = symbol.toUpperCase().trim();
  if (s.includes("XLM") || s.includes("STELLAR")) {
    return "/assets/chains/stellar.png";
  }
  if (s.includes("USDC")) {
    return "/coins/usdc.svg";
  }
  if (s.includes("USDT") || s.includes("TETHER")) {
    return "/coins/usdt.svg";
  }
  if (s.includes("SOL") || s.includes("SOLANA")) {
    return "/coins/sol.svg";
  }
  if (s.includes("BTC") || s.includes("BITCOIN")) {
    return "/coins/btc.svg";
  }
  if (s.includes("BNB") || s.includes("BINANCE")) {
    return "/coins/bnb.svg";
  }
  if (s.includes("POL") || s.includes("POLYGON") || s.includes("MATIC")) {
    return "/coins/pol.svg";
  }
  if (s.includes("CELO")) {
    return "/coins/celo.svg";
  }
  if (s.includes("ETH") || s.includes("ETHEREUM") || s.includes("BASE")) {
    return "/coins/eth.svg";
  }
  if (s.includes("USD")) {
    return "/coins/usdc.svg";
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

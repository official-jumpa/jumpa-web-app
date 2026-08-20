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
  if (s.includes("USDT")) {
    return "/coins/usdt.svg";
  }
  if (s.includes("SOL") || s.includes("SOLANA")) {
    return "/coins/sol.svg";
  }
  if (s.includes("BTC") || s.includes("BITCOIN")) {
    return "/coins/btc.svg";
  }
  if (s.includes("ETH") || s.includes("ETHEREUM") || s.includes("BASE")) {
    return "/coins/eth.svg";
  }
  if (s.includes("USD")) {
    return "/coins/usdc.svg";
  }
  return "/images/home/coin-generic.svg";
}

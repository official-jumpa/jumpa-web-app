export const SOROSWAP_TESTNET_CONTRACTS = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  USDC: "CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F",
  USDT: "CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F",
  EURC: "CBQDUWBOHS7P4TZIJ3KUPUZQOWMKJC6CQPPFEONSV3BH4X27YVEXWNOT",
};

export const SOROSWAP_MAINNET_CONTRACTS = {
  XLM: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
  USDC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  USDT: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
};

export const SOROSWAP_PROTOCOLS = ["soroswap", "aqua", "phoenix", "sdex"];

/**
 * Resolves a token symbol or raw contract address to a Soroswap contract address.
 */
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
  if (upper === "EURC" || upper === "EUR") {
    return (contracts as any).EURC || contracts.USDC;
  }

  // If already a 56-character contract id (C...)
  if (tokenOrAddress.startsWith("C") && tokenOrAddress.length === 56) {
    return tokenOrAddress;
  }

  return contracts.XLM;
}

/**
 * Resolves a Soroswap contract address back to a readable token symbol.
 */
export function resolveSoroswapSymbol(
  contractAddress: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (
    contractAddress === SOROSWAP_MAINNET_CONTRACTS.USDC ||
    contractAddress === SOROSWAP_TESTNET_CONTRACTS.USDC ||
    contractAddress.toUpperCase() === "USDC" ||
    contractAddress.toUpperCase() === "USDT" ||
    contractAddress.toUpperCase() === "USD"
  ) {
    return "USDC";
  }
  if (
    contractAddress === SOROSWAP_MAINNET_CONTRACTS.XLM ||
    contractAddress === SOROSWAP_TESTNET_CONTRACTS.XLM ||
    contractAddress.toUpperCase() === "XLM" ||
    contractAddress.toUpperCase() === "NATIVE"
  ) {
    return "XLM";
  }
  return contractAddress;
}

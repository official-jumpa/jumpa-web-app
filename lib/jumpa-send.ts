import { getAssetLogo } from "@/lib/assets";
import { FLAGS } from "@/lib/flags";
import { BASELINE_RATES } from "@/lib/rates";
import { FIAT_DECIMALS, decimalsFor } from "@/lib/token-amount";
import { formatAmount } from "@/lib/transfer";

/** Chains a Jumpa user can be paid on, keyed like `NetworkConfig.chain`. */
export type JumpaChain = "stellar" | "solana" | "base" | "eth" | "tron";

/** Who a lookup resolved to. Only the addresses the recipient actually has. */
export interface JumpaRecipient {
  name: string;
  tag: string | null;
  image: string | null;
  addresses: Partial<Record<JumpaChain, string>>;
}

/**
 * What the sender picks, and what actually moves on chain. Fiat is priced in
 * its own currency and settles as Stellar USDC at the live rate.
 */
export interface SendAsset {
  code: string;
  name: string;
  kind: "fiat" | "crypto";
  icon: string;
  token: string;
  network: string;
  chain: JumpaChain;
}

const STELLAR_USDC = { token: "USDC", network: "Stellar Mainnet", chain: "stellar" } as const;

// The design also lists EUR, CNY and BTC; none of them has a rate or a rail yet.
export const JUMPA_SEND_ASSETS: SendAsset[] = [
  { code: "USD", name: "US Dollar", kind: "fiat", icon: FLAGS.US, ...STELLAR_USDC },
  { code: "NGN", name: "Nigerian Naira", kind: "fiat", icon: FLAGS.NG, ...STELLAR_USDC },
  { code: "KES", name: "Kenyan Shilling", kind: "fiat", icon: FLAGS.KE, ...STELLAR_USDC },
  { code: "GHS", name: "Ghana Cedis", kind: "fiat", icon: FLAGS.GH, ...STELLAR_USDC },
  { code: "ETH", name: "Ethereum", kind: "crypto", icon: getAssetLogo("ETH"), token: "ETH", network: "Base", chain: "base" },
  { code: "SOL", name: "Solana", kind: "crypto", icon: getAssetLogo("SOL"), token: "SOL", network: "Solana", chain: "solana" },
  { code: "XLM", name: "Stellar", kind: "crypto", icon: getAssetLogo("XLM"), token: "XLM", network: "Stellar Mainnet", chain: "stellar" },
  { code: "USDC", name: "USD Coin", kind: "crypto", icon: getAssetLogo("USDC"), token: "USDC", network: "Stellar Mainnet", chain: "stellar" },
  { code: "USDT", name: "Tether", kind: "crypto", icon: getAssetLogo("USDT"), token: "USDT", network: "Solana", chain: "solana" },
];

export const ASSET_GROUPS = [
  { kind: "fiat", label: "Fiat Currency" },
  { kind: "crypto", label: "Cryptocurrency" },
] as const;

export const DEFAULT_SEND_ASSET = JUMPA_SEND_ASSETS[0];

/** Stellar text memos hold 28 bytes, and the narration rides in one. */
export const NARRATION_MAX_BYTES = 28;

export const narrationBytes = (text: string) => new TextEncoder().encode(text).length;

/** Drops trailing characters until the note fits, so a long paste is cut, not refused. */
export function clampNarration(text: string): string {
  let out = text;
  while (narrationBytes(out) > NARRATION_MAX_BYTES) out = Array.from(out).slice(0, -1).join("");
  return out;
}

/** One unit of a fiat currency per dollar, or null until the live rate lands. */
export type FiatRates = Record<string, { symbol: string; perUsd: number }>;

export const fiatSymbol = (code: string) =>
  BASELINE_RATES.fiatRates[code]?.symbol ?? `${code} `;

export const decimalsForAsset = (asset: SendAsset) =>
  asset.kind === "fiat" ? FIAT_DECIMALS : decimalsFor(asset.token);

/** "$2,480.00", "₦3,400,000.00" or "12.5 XLM". */
export function formatAssetAmount(asset: SendAsset, value: number): string {
  if (asset.kind === "crypto") {
    return `${formatAmount(String(floorTo(value, decimalsFor(asset.token))))} ${asset.code}`;
  }
  return `${fiatSymbol(asset.code)}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Never round a balance or a payout up: it would promise money that is not there. */
export function floorTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.floor(value * f) / f;
}

/** Units of the picked asset per dollar. USD and crypto need no rate. */
export function perUsd(asset: SendAsset, rates: FiatRates | null): number | null {
  if (asset.kind === "crypto" || asset.code === "USD") return 1;
  return rates?.[asset.code]?.perUsd ?? null;
}

/** What actually moves on chain for an amount typed in `asset`. */
export function settlementAmount(
  asset: SendAsset,
  typed: number,
  rates: FiatRates | null,
): number | null {
  const rate = perUsd(asset, rates);
  if (!rate) return null;
  return asset.kind === "crypto"
    ? typed
    : floorTo(typed / rate, decimalsFor(asset.token));
}

/** The rate line under the amount: "$1~₦1,372" for fiat, "1 XLM~$0.12" for crypto. */
export function rateLabel(
  asset: SendAsset,
  rates: FiatRates | null,
  priceUsd: number,
): string | null {
  if (asset.kind === "crypto") {
    if (!priceUsd) return null;
    const digits = priceUsd < 1 ? 4 : 2;
    return `1 ${asset.code}~$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
  }
  const quote = asset.code === "USD" ? "NGN" : asset.code;
  const rate = rates?.[quote]?.perUsd;
  if (!rate) return null;
  return `$1~${fiatSymbol(quote)}${rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** "@barryallen", or the name when the recipient has no tag yet. */
export const recipientHandle = (r: JumpaRecipient) => (r.tag ? `@${r.tag}` : r.name);

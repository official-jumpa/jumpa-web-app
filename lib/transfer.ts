/**
 * Placeholder data and shared types for the send and swap flows. Nothing here
 * touches a network yet — the screens are wired end to end against these.
 */

export type Country = {
  code: string;
  label: string;
  currency: string;
  /** US-style rails need a routing number and a typed account name. */
  routing: boolean;
};

export const COUNTRIES: Country[] = [
  {
    code: "US",
    label: "United States of America",
    currency: "USD",
    routing: true,
  },
  { code: "NG", label: "Nigeria", currency: "NGN", routing: false },
  { code: "GH", label: "Ghana", currency: "GHS", routing: false },
  { code: "KE", label: "Kenya", currency: "KES", routing: false },
  { code: "ZA", label: "South Africa", currency: "ZAR", routing: false },
];

export const BANKS: Record<string, string[]> = {
  US: ["Chase Bank", "Bank of America", "Wells Fargo", "Citibank"],
  NG: ["Opay", "GTBank", "Access Bank", "Zenith Bank", "UBA"],
  GH: ["GCB Bank", "Absa Ghana", "Ecobank Ghana"],
  KE: ["Equity Bank", "KCB Bank", "Co-operative Bank"],
  ZA: ["Standard Bank", "FNB", "Nedbank"],
};

export type BankAccount = {
  id: string;
  name: string;
  bank: string;
  number: string;
};

/** "Recent accounts" on the bank-transfer form. Empty hides the section. */
export const RECENT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "olafunke",
    name: "Olafunke Mariam",
    bank: "UBA",
    number: "2319383829",
  },
  {
    id: "chinedu",
    name: "Chinedu Okafor",
    bank: "GTBank",
    number: "0048392012",
  },
  {
    id: "amina",
    name: "Amina Yusuf",
    bank: "Access Bank",
    number: "8723498723",
  },
  {
    id: "emeka",
    name: "Emeka Nwosu",
    bank: "Zenith Bank",
    number: "9988776655",
  },
];

export type WalletContact = {
  id: string;
  handle: string;
  network: string;
  address: string;
};

/** "Recent accounts" on the wallet-address form. */
export const RECENT_WALLETS: WalletContact[] = [
  {
    id: "dvin",
    handle: "Dvin.sol",
    network: "Stellar",
    address: "GD3PSH6RRKIIBZ7FD7KNSQCQ6QXKCHD",
  },
  {
    id: "nebulax",
    handle: "NebulaX.app",
    network: "Cosmos",
    address: "AT9JQ8ZHTNMWQPLX2",
  },
  {
    id: "orbithub",
    handle: "OrbitHub.io",
    network: "Ethereum",
    address: "7F3BV9YTQWMZK91",
  },
];

/** Quick-fill chips above the keypad; MAX is rendered alongside them. */
export const QUICK_AMOUNTS = [5, 25, 50, 100] as const;

/** Products the balance breaks down into. A null amount is not live yet. */
export type BalanceBucket = {
  id: string;
  label: string;
  caption?: string;
  amount: string | null;
};

export const BALANCE_BUCKETS: BalanceBucket[] = [
  { id: "savings", label: "Savings", amount: "$0.00" },
  { id: "credit", label: "Credit", amount: null },
  { id: "commercial-paper", label: "Commercial paper", amount: "$0.00" },
  {
    id: "available",
    label: "Available",
    caption: "Ready for transactions",
    amount: "$0.00",
  },
];

/** Placeholder swap quote until the DEX route is wired in. */
export const SWAP_QUOTE = {
  rate: 3.25,
  provider: "Soroswap",
  networkFee: "0.001 XLM (~$0.001)",
  slippage: "0.5%",
  settlement: "3-5 seconds",
  /** Seconds a quote stays valid, as the design states it. */
  lockSeconds: 30,
};

/** The PIN the placeholder flows accept. Replace with a real verification call. */
export const DEMO_PIN = "1234";

/** First and last few characters of a long chain address. */
export function shortenAddress(address: string, lead = 5, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  // slice(-0) returns the whole string, so index from the length instead.
  return `${address.slice(0, lead)}...${address.slice(address.length - tail)}`;
}

/** Chains the wallet-address form offers. */
export const NETWORKS = [
  "Stellar Mainet",
  "Solana",
  "Base",
  "Ethereum",
  "Cosmos",
] as const;

/** Assets that can leave the wallet. */
export const SEND_ASSETS = ["USDC", "USDT", "XLM"] as const;

/** Where an incoming deposit lands. One entry per asset once balances are live. */
export const DEPOSIT_ACCOUNT = {
  network: "Solana",
  address: "xi2edg72372uged8c92ec29dec9",
};

/** Rules the deposit screen lists under the QR. */
export const DEPOSIT_NOTES = [
  "Minimum deposit: $2",
  "Funds auto-convert to USDC and arrive in your Jumpa wallet",
  "Funds arrive in ~1 minutes after confirmation",
  "Other tokens accepted on TON: GRAM, USDT",
];

/** Spendable balance the transfer screens show until live balances land. */
export const SEND_BALANCE = { symbol: "USDC", balance: "$450.50" };

/** Pair the swap screen opens on. */
export const SWAP_PAIR = {
  from: { symbol: "USDC", balance: "$450.50" },
  to: { symbol: "XLM", balance: "0.00" },
};

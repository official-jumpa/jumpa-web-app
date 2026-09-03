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

/** Placeholder names the stub resolver returns. Not real account holders. */
const RESOLVED_NAMES = [
  "Adekunle Michael",
  "Olafunke Mariam",
  "Chinedu Okafor",
  "Amina Yusuf",
  "Jorge Burrows",
  "Emeka Nwosu",
];

/**
 * Stands in for the bank's name-enquiry call: given an account number and a
 * bank, the rails return the account holder. Deterministic so a given number
 * always resolves to the same name; replace with the real lookup.
 */
export function resolveAccountName(
  bank: string,
  account: string,
): Promise<string> {
  const digits = account.replace(/\D/g, "");
  const seed = [...`${bank}${digits}`].reduce(
    (sum, c) => sum + c.charCodeAt(0),
    0,
  );
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(RESOLVED_NAMES[seed % RESOLVED_NAMES.length]),
      600,
    ),
  );
}

/** An account number is only worth looking up once it is this long. */
export const ACCOUNT_NUMBER_MIN = 10;

/** US routing numbers are fixed-length. */
export const ROUTING_NUMBER_LENGTH = 9;

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
/** Thousands separators, as the design prints every entered amount. */
export function formatAmount(value: string): string {
  const [whole = "", decimals] = value.split(".");
  const grouped = whole ? Number(whole).toLocaleString("en-US") : "";
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

export const DEMO_PIN = "1234";

/** First and last few characters of a long chain address. */
export function shortenAddress(address: string, lead = 5, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  // slice(-0) returns the whole string, so index from the length instead.
  return `${address.slice(0, lead)}...${address.slice(address.length - tail)}`;
}

export type NetworkConfig = {
  id: string;
  name: string;
  chain: "stellar" | "solana" | "base" | "eth";
  network: "mainnet" | "testnet";
  assets: readonly string[];
  supportsMemo: boolean;
  feeLabel: string;
  settlementTime: string;
};

// later derive the fee from blockchain
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  "Stellar Mainnet": {
    id: "stellar-mainnet",
    name: "Stellar Mainnet",
    chain: "stellar",
    network: "mainnet",
    assets: ["XLM", "USDC"],
    supportsMemo: true,
    feeLabel: "0.00001 XLM (~$0.0001)",
    settlementTime: "3-5 seconds",
  },
  "Stellar Testnet": {
    id: "stellar-testnet",
    name: "Stellar Testnet",
    chain: "stellar",
    network: "testnet",
    assets: ["XLM", "USDC"],
    supportsMemo: true,
    feeLabel: "0.00001 XLM (Free)",
    settlementTime: "3-5 seconds",
  },
  Solana: {
    id: "solana",
    name: "Solana",
    chain: "solana",
    network: "mainnet",
    assets: ["SOL", "USDC", "USDT"],
    supportsMemo: false,
    feeLabel: "0.000005 SOL (~$0.001)",
    settlementTime: "1-2 seconds",
  },
  Base: {
    id: "base",
    name: "Base",
    chain: "base",
    network: "mainnet",
    assets: ["ETH", "USDC"],
    supportsMemo: false,
    feeLabel: "0.00001 ETH (~$0.03)",
    settlementTime: "2-3 seconds",
  },
  Ethereum: {
    id: "ethereum",
    name: "Ethereum",
    chain: "eth",
    network: "mainnet",
    assets: ["ETH", "USDC", "USDT"],
    supportsMemo: false,
    feeLabel: "0.0005 ETH (~$1.50)",
    settlementTime: "12-15 seconds",
  },
};

/** Chains the wallet-address form offers. */
export const NETWORKS = Object.keys(NETWORK_CONFIGS);

/** Assets that can leave the wallet. */
export const SEND_ASSETS = ["USDC", "USDT", "XLM", "SOL", "ETH"] as const;

/** Rules the deposit screen lists under the QR, for the chain in play. */
export function depositNotes(symbol: string, network: string): string[] {
  return [
    "Minimum deposit: $2",
    `Only send ${symbol} on the ${network} network — anything else is lost`,
    "Funds arrive in ~1 minute after confirmation",
    "Funds auto-convert to USDC and arrive in your Jumpa wallet",
  ];
}

/** Spendable balance the transfer screens show until live balances land. */
export const SEND_BALANCE = { symbol: "USDC", balance: "$450.50" };

/** Pair the swap screen opens on. */
export const SWAP_PAIR = {
  from: { symbol: "USDC", balance: "$450.50" },
  to: { symbol: "XLM", balance: "0.00" },
};

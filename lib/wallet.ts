export interface UserAccountInfo {
  firstName: string;
  avatar: string;
  verified: boolean;
  balance: string;
  kyc: { completed: number; total: number };
}

export const ACCOUNT: UserAccountInfo = {
  firstName: "User",
  avatar: "/images/home/avatar-illustration.webp",
  verified: true,
  balance: "0.00",
  kyc: { completed: 4, total: 5 },
};

export type Asset = {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  change: string;
  /** How the wallet list prints it — the design says STELLAR, not XLM. */
  label?: string;
};

/** Every wallet the app supports, in the order the wallet list shows them. */
export const SUPPORTED_ASSETS: Asset[] = [
  {
    symbol: "XLM",
    name: "Stellar",
    label: "STELLAR",
    icon: "/coins/xlm.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    icon: "/coins/btc.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "/coins/usdc.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "USDT",
    name: "Tether",
    icon: "/coins/usdt.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "/coins/eth.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "SOL",
    name: "Solana",
    icon: "/coins/sol.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "TRX",
    name: "Tron",
    icon: "/coins/trx.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "TON",
    name: "Toncoin",
    icon: "/coins/ton.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "SUI",
    name: "Sui",
    icon: "/coins/sui.webp",
    balance: "$0.00",
    change: "+$0.00",
  },
];

/** The three the home hero scrolls through; the design draws exactly these. */
const HOME_WALLETS = ["XLM", "USDC", "USDT"];

export const ASSETS: Asset[] = SUPPORTED_ASSETS.filter((asset) =>
  HOME_WALLETS.includes(asset.symbol),
);

export type TransactionStatus = "completed" | "pending" | "failed";

/** Picks the glyph on the row's tile. */
export type TransactionKind = "send" | "receive" | "card";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  title: string;
  /** Counterparty and time, pre-joined: "To 0x82...4F2A • Today, 2:34 PM". */
  detail: string;
  amount: string;
  status: TransactionStatus;
  /** Network badge on the tile; omit for none. */
  chain?: string;
};

export const TRANSACTIONS: Transaction[] = [];

export type Ad = {
  id: string;
  src: string;
  /** What the art says, for anyone who cannot see it. */
  alt: string;
  href: string;
};

/** Offer art for the home banner, in rotation order. */
export const ADS: Ad[] = [
  {
    id: "savings",
    src: "/images/home/Ads1.png",
    alt: "Don't just save. Grow — earn while your money sits in savings.",
    href: "/savings",
  },
  {
    id: "referrals",
    src: "/images/home/Ads2.png",
    alt: "Your friends need Jumpa too. Invite them and earn rewards.",
    href: "/referrals",
  },
  {
    id: "invest",
    src: "/images/home/Ads3.png",
    alt: "Your money can do more. Put it to work and earn.",
    href: "/invest",
  },
];

export type Promotion = {
  id: string;
  tone: "lime" | "purple";
  title: string;
  highlight: string;
  brand: string;
  description: string;
  href: string;
};

export const PROMOTIONS: Promotion[] = [
  {
    id: "zero-fees-lime",
    tone: "lime",
    highlight: "0%",
    title: " Transfer Charges with ",
    brand: "Jumpa",
    description: "Move your money freely with Jumpa.",
    href: "/home",
  },
  {
    id: "zero-fees-purple",
    tone: "purple",
    highlight: "0%",
    title: " Transfer Charges with ",
    brand: "Jumpa",
    description: "Move your money freely with Jumpa.",
    href: "/home",
  },
];

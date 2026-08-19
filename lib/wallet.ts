/** Placeholder home-screen data from the design, replaced once the wallet layer lands. */

export const ACCOUNT = {
  firstName: "Bharry",
  avatar: "/images/home/avatar.webp",
  verified: true,
  /** Total across all assets, already grouped for display. */
  balance: "144,760.21",
  /** Steps done out of the total; the card hides once they match. */
  kyc: { completed: 4, total: 5 },
} as const;

export type Asset = {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  change: string;
};

export const ASSETS: Asset[] = [
  {
    symbol: "XLM",
    name: "Stellar",
    icon: "/images/home/coin-generic.svg",
    balance: "$0.17.3",
    change: "+$1.23",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    icon: "/images/home/coin-bitcoin.svg",
    balance: "$144,760.21",
    change: "+$2.23",
  },
  {
    symbol: "USDC",
    name: "Stellar",
    icon: "/images/home/usdcImg.png",
    balance: "$1,760.21",
    change: "+$0.99",
  },
];

export type Transaction = {
  id: string;
  merchant: string;
  date: string;
  amount: string;
};

export const TRANSACTIONS: Transaction[] = [
  { id: "1", merchant: "FIGMA", date: "16th Aug, 2026", amount: "-$260" },
  { id: "2", merchant: "X.CORP", date: "16th Aug, 2026", amount: "-$260" },
  { id: "3", merchant: "NETFLIX", date: "16th Aug, 2026", amount: "-$260" },
  { id: "4", merchant: "PRIME VIDEO", date: "16th Aug, 2026", amount: "-$260" },
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

/**
 * Jumpa AI — Tool Executor
 *
 * Executes tool calls dispatched by the DeepSeek AI.
 * Each tool is network-scoped — the tool name is the source of truth for chain/network.
 * Returns both structured card data and a plain-text summary for the AI's follow-up response.
 */

import { getBridgeQuote } from "@/lib/bridge";
import { fetchStellarBalances, fundTestnetAccount } from "@/lib/chains/stellar";
import { getAssetLogo } from "@/lib/assets";
import type {
  AccountsCard,
  BridgeCard,
  ChatOption,
  PlansCard,
} from "@/lib/chat";
import { connectDB } from "@/lib/db";
import { getSwapQuote } from "@/lib/dex";
import type { SwapQuote } from "@/lib/dex/types";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { SwitchService } from "@/lib/switch";
import { resolveBankCode } from "@/lib/switch-banks";
import {
  getCachedWalletBalances,
  type TokenBalanceInfo,
} from "@/lib/wallet-balances";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { listSavingsPlansByUserId } from "@/lib/functions/savingsFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { toChatPlan } from "./savings-plan-card";
import { getNetworkFromToolName, type JumpaToolName } from "./tools";
import { analyzeImageWithGemini } from "./vision";
import { getCentiivQuote, createCentiivOnramp, createCentiivOfframp } from "@/lib/functions/centiivFunctions";
import { findCentiivBank } from "@/lib/constants/centiiv-banks";
import { getLiveRates } from "@/lib/rates";
import { getSponsorKeypair } from "@/lib/chains/stellar/sponsor";

export type CardHint =
  | { type: "quote"; data: QuoteCardData }
  | { type: "bridge"; data: BridgeCard }
  | { type: "transfer"; data: Record<string, any> }
  | { type: "onramp"; data: Record<string, any> }
  | { type: "offramp"; data: Record<string, any> }
  | { type: "sep24"; data: Record<string, any> }
  | { type: "options"; data: { options: ChatOption[] } }
  | { type: "plans"; data: PlansCard }
  | { type: "accounts"; data: AccountsCard }
  | { type: "none" };

export interface QuoteCardData {
  title: string;
  status: { lead: string; value: string };
  pay: { caption: string; value: string; badge: string };
  receive: { caption: string; value: string; badge: string };
  stats: Array<{ lead?: string; value: string }>;
  _rawQuote: SwapQuote;
  network: "testnet" | "mainnet";
  chain: string;
}

export interface ToolResult {
  toolName: string;
  /** Plain-text summary sent back to the AI for its follow-up message */
  summaryForAI: string;
  /** Structured card data for the UI (if applicable) */
  cardHint: CardHint;
  /** Transaction params if this result requires a confirmation flow */
  transactionParams?: Record<string, any>;
  /** Whether this result needs user confirmation (PIN flow) */
  requiresConfirmation: boolean;
}

function mapAssetToTxChain(
  asset: string,
): "stellar" | "solana" | "base" | "eth" {
  const c = (asset.split(":")[0] || "base").toLowerCase();
  if (c === "solana") return "solana";
  if (c === "stellar") return "stellar";
  if (c === "ethereum" || c === "eth") return "eth";
  return "base";
}

/**
 * Execute a tool call from the AI and return a ToolResult.
 * @param toolName  - The function name the AI called
 * @param toolArgs  - The parsed arguments object
 * @param userCtx   - Runtime context (user addresses, authenticated userId, etc.)
 */
/** Assets Switch can pay out to NGN. */
const OFFRAMPABLE = new Set(["USDC", "USDT", "CNGN"]);

/**
 * Can this holding actually be cashed out? Stellar settles through Centiiv
 * rather than Switch, and Centiiv only handles USDC — so the chain decides the
 * token, not just the token itself.
 */
export function isSellable(token: TokenBalanceInfo): boolean {
  const symbol = token.symbol.toUpperCase();
  if (token.isTestnet || !OFFRAMPABLE.has(symbol)) return false;
  if (token.network?.toLowerCase().includes("stellar")) return symbol === "USDC";
  return true;
}

/**
 * Balances are printed rounded DOWN. A raw float ("7.9966835 XLM") reads as a
 * broken number, and rounding up would claim more than the wallet holds.
 */
function formatBalance(raw: string | number): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return "0";
  const digits = value > 0 && value < 0.01 ? 6 : 2;
  const factor = 10 ** digits;
  return (Math.floor(value * factor) / factor).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

/**
 * Where the money comes from. The design draws a Savings/Balance split; there is
 * no savings balance yet, so the rows are the holdings that can actually be sold
 * — which is also what the offramp needs (token + network) and saves asking twice.
 */
function fundingOptions(tokens: TokenBalanceInfo[]): ChatOption[] {
  return tokens
    .filter((token) => isSellable(token) && Number(token.balance) > 0)
    .map((token) => ({
      label: token.network
        ? `${token.symbol} on ${token.network}`
        : token.symbol,
      amount: formatBalance(token.balance),
      logo: getAssetLogo(token.symbol),
      reply: token.network
        ? `Sell my ${token.symbol} on ${token.network}`
        : `Sell my ${token.symbol}`,
    }));
}

/**
 * Every pair that can be cashed out, as a chooser. Used only when balances
 * cannot be read — the user picks the network, we never assume one for them.
 */
const SELLABLE_ASSETS: ChatOption[] = [
  { symbol: "USDC", network: "Base" },
  { symbol: "USDC", network: "Solana" },
  { symbol: "USDC", network: "Ethereum" },
  { symbol: "USDC", network: "Stellar" },
  { symbol: "USDT", network: "Solana" },
  { symbol: "USDT", network: "Ethereum" },
].map(({ symbol, network }) => ({
  label: `${symbol} on ${network}`,
  logo: getAssetLogo(symbol),
  reply: `Sell my ${symbol} on ${network}`,
}));

/** Map a balance record's network label to a Switch-supported chain identifier. */
function networkToSwitchChain(network?: string): string | null {
  if (!network) return null;
  const n = network.toLowerCase();
  // Stellar first — "Stellar Mainnet" would otherwise be read as Ethereum below.
  if (n.includes("stellar")) return "stellar";
  if (n.includes("base")) return "base";
  if (n.includes("solana")) return "solana";
  if (n.includes("tron")) return "tron";
  if (n.includes("ethereum") || (n.includes("mainnet") && !n.includes("stellar"))) return "ethereum";
  if (n.includes("polygon")) return "polygon";
  if (n.includes("arbitrum")) return "arbitrum";
  if (n.includes("optimism")) return "optimism";
  if (n.includes("avalanche")) return "avalanche";
  return null;
}

/** Banks that most often share a NUBAN, probed when only an account number is given. */
const CANDIDATE_BANKS = [
  "OPay",
  "Moniepoint",
  "PalmPay",
  "Kuda",
  "Guaranty Trust Bank",
  "Access Bank",
  "Zenith Bank",
  "First Bank of Nigeria",
  "United Bank For Africa",
];

/** Which of those actually hold the number — a NUBAN is not unique across banks. */
async function resolveBankCandidates(accountNumber: string) {
  let cleanNumber = accountNumber.trim().replace(/\D/g, "");
  if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
    cleanNumber = cleanNumber.slice(3);
  }
  const found = await Promise.all(
    CANDIDATE_BANKS.map(async (bankName) => {
      const bank = findPaystackBank(bankName);
      if (!bank) return null;
      try {
        const res = await validateAccountNumber(cleanNumber, bank.code);
        const holder = res?.data?.account_name?.trim();
        return res?.status && holder ? { bank: bank.name, holder } : null;
      } catch {
        return null;
      }
    }),
  );
  return found.filter((entry): entry is { bank: string; holder: string } =>
    Boolean(entry),
  );
}

/** The last account this user cashed out to, so the design's Saved Account row is real. */
async function lastPayoutAccount(userId: string) {
  await connectDB();
  const previous = await Transaction.findOne({
    userId,
    "rampDetails.bankDetails.accountNumber": {
      $exists: true,
      $nin: [null, ""],
    },
  })
    .sort({ createdAt: -1 })
    .lean<{
      rampDetails?: {
        bankDetails?: {
          bankName?: string;
          accountNumber?: string;
          accountName?: string;
        };
      };
    }>();
  const saved = previous?.rampDetails?.bankDetails;
  return saved?.accountNumber && saved.bankName ? saved : null;
}

/** Savings goal categories. A Custom row opens a field in the card. */
const SAVINGS_CATEGORIES: ChatOption[] = [
  { label: "Rent", icon: "savings", reply: "Rent" },
  { label: "Travel", icon: "savings", reply: "Travel" },
  { label: "Groceries", icon: "savings", reply: "Groceries" },
  { label: "Transportation", icon: "savings", reply: "Transportation" },
  {
    label: "Others",
    icon: "savings",
    custom: true,
    placeholder: "Enter a category",
  },
];

/** The savings choosers the design draws. A Custom row opens a field in the card. */
const SAVINGS_AMOUNTS: ChatOption[] = [
  { label: "$1000" },
  { label: "$10,000" },
  { label: "$25,000" },
  { label: "$100,000" },
  { label: "Custom Amount", custom: true, placeholder: "Enter an amount" },
];

const SAVINGS_DURATIONS: ChatOption[] = [
  { label: "30 days" },
  { label: "60 days" },
  { label: "90 days" },
  { label: "Custom", custom: true, placeholder: "Number of days" },
];

const SAVINGS_INITIAL_DEPOSITS: ChatOption[] = [
  { label: "$0 (Skip for now)", reply: "$0" },
  { label: "$10", reply: "$10" },
  { label: "$25", reply: "$25" },
  { label: "$50", reply: "$50" },
  { label: "Custom Amount", custom: true, placeholder: "Amount in USD" },
];

const SAVINGS_DEPOSIT_QUICK_AMOUNTS: ChatOption[] = [
  { label: "$25", reply: "$25" },
  { label: "$50", reply: "$50" },
  { label: "$100", reply: "$100" },
  { label: "$250", reply: "$250" },
  { label: "Custom Amount", custom: true, placeholder: "Amount in USD" },
];

/** The two networks a Stellar swap can run on. */
const SWAP_NETWORKS: ChatOption[] = [
  {
    label: "Stellar Testnet",
    description: "Test tokens",
    icon: "crypto",
    reply: "Swap on Stellar Testnet",
  },
  {
    label: "Stellar Mainnet",
    description: "Live funds from your wallet",
    icon: "crypto",
    reply: "Swap on Stellar Mainnet",
  },
];

/** Soroswap trades XLM against USDC; there is no third asset to offer. */
const SWAP_ASSETS = ["XLM", "USDC"] as const;

const swapFromOptions = (): ChatOption[] =>
  SWAP_ASSETS.map((token) => ({
    label: token,
    logo: getAssetLogo(token),
    reply: `Swap from ${token}`,
  }));

const swapToOptions = (from: string): ChatOption[] =>
  SWAP_ASSETS.filter((token) => token !== from).map((token) => ({
    label: token,
    logo: getAssetLogo(token),
    reply: `Receive ${token}`,
  }));

const swapAmountOptions = (token: string): ChatOption[] => [
  { label: `10 ${token}` },
  { label: `25 ${token}` },
  { label: `50 ${token}` },
  { label: `100 ${token}` },
  { label: "Custom Amount", custom: true, placeholder: `Amount in ${token}` },
];

/** Supported chains for cross-chain USDC bridging via Circle CCTP v2. */
async function getBridgeSourceChainOptions(
  userId?: string,
  stellarAddress?: string,
  toChain?: "stellar" | "base" | "ethereum" | null,
): Promise<ChatOption[]> {
  let stellarUsdc = "0.00";
  let baseUsdc = "0.00";
  let ethUsdc = "0.00";

  try {
    if (userId && userId !== "UNKNOWN") {
      const balances = await getCachedWalletBalances(userId);
      if (balances?.tokens) {
        for (const t of balances.tokens) {
          if (t.symbol?.toUpperCase() === "USDC") {
            const net = (t.network || "").toLowerCase();
            if (net.includes("stellar") && !t.isTestnet) {
              stellarUsdc = formatBalance(t.balance);
            } else if (net.includes("base") && !t.isTestnet) {
              baseUsdc = formatBalance(t.balance);
            } else if (net.includes("eth") && !t.isTestnet) {
              ethUsdc = formatBalance(t.balance);
            }
          }
        }
      }
    }

    if (
      stellarAddress &&
      stellarAddress.startsWith("G") &&
      stellarUsdc === "0.00"
    ) {
      const stellar = await fetchStellarBalances(stellarAddress);
      if (stellar.mainnet?.usdc) {
        stellarUsdc = formatBalance(stellar.mainnet.usdc);
      }
    }
  } catch (err) {
    console.warn(
      "[Bridge] Error loading mainnet balances for chain options:",
      err,
    );
  }

  const all: {
    id: "stellar" | "base" | "ethereum";
    label: string;
    description: string;
    amount: string;
    logo: string;
    reply: string;
  }[] = [
      {
        id: "stellar",
        label: "Stellar",
        description: "Circle CCTP v2",
        amount: `${stellarUsdc} USDC`,
        logo: "/coins/xlm.webp",
        reply: "Bridge from Stellar",
      },
      {
        id: "base",
        label: "Base",
        description: "Circle CCTP v2",
        amount: `${baseUsdc} USDC`,
        logo: "/coins/base.webp",
        reply: "Bridge from Base",
      },
      {
        id: "ethereum",
        label: "Ethereum",
        description: "Circle CCTP v2",
        amount: `${ethUsdc} USDC`,
        logo: "/coins/eth.webp",
        reply: "Bridge from Ethereum",
      },
    ];

  return all
    .filter((c) => !toChain || c.id !== toChain)
    .map((c) => ({
      label: c.label,
      description: c.description,
      amount: c.amount,
      logo: c.logo,
      reply: c.reply,
    }));
}

function bridgeDestChains(
  fromChain: "stellar" | "base" | "ethereum",
): ChatOption[] {
  const all: {
    id: "stellar" | "base" | "ethereum";
    label: string;
    description: string;
    logo: string;
    reply: string;
  }[] = [
      {
        id: "stellar",
        label: "Stellar",
        description: "Circle CCTP v2",
        logo: "/coins/xlm.webp",
        reply: "Bridge to Stellar",
      },
      {
        id: "base",
        label: "Base",
        description: "Circle CCTP v2",
        logo: "/coins/base.webp",
        reply: "Bridge to Base",
      },
      {
        id: "ethereum",
        label: "Ethereum",
        description: "Circle CCTP v2",
        logo: "/coins/eth.webp",
        reply: "Bridge to Ethereum",
      },
    ];
  return all
    .filter((c) => c.id !== fromChain)
    .map((c) => ({
      label: c.label,
      description: c.description,
      logo: c.logo,
      reply: c.reply,
    }));
}

const BRIDGE_AMOUNTS: ChatOption[] = [
  { label: "1 USDC", amount: "$1.00", logo: "/coins/usdc.webp", reply: "1 USDC" },
  { label: "5 USDC", amount: "$5.00", logo: "/coins/usdc.webp", reply: "5 USDC" },
  { label: "10 USDC", amount: "$10.00", logo: "/coins/usdc.webp", reply: "10 USDC" },
  { label: "25 USDC", amount: "$25.00", logo: "/coins/usdc.webp", reply: "25 USDC" },
  { label: "Custom Amount", custom: true, placeholder: "Enter amount in USDC" },
];

function parseBridgeChain(
  val?: string,
): "stellar" | "base" | "ethereum" | null {
  if (!val) return null;
  const s = val.toLowerCase().trim();
  if (s.includes("stellar") || s.includes("xlm") || s.includes("soroban"))
    return "stellar";
  if (s.includes("base")) return "base";
  if (s.includes("eth") || s.includes("sepolia") || s.includes("ethereum"))
    return "ethereum";
  return null;
}

function getBridgeChainDisplayName(
  chain: "stellar" | "base" | "ethereum",
): string {
  switch (chain) {
    case "stellar":
      return "Stellar";
    case "base":
      return "Base";
    case "ethereum":
      return "Ethereum";
  }
}

/**
 * Loads the user's actual wallet balance for proposal cards.
 * Returns formatted string like "$150.00" or specific token balance if available.
 */
async function getActualUserBalance(
  userId?: string,
  stellarAddress?: string,
  tokenSymbol: string = "USDC",
): Promise<string> {
  try {
    if (!userId && !stellarAddress) return "$0.00";

    const target = userId || stellarAddress!;
    const balances = await getCachedWalletBalances(target);

    if (balances) {
      // 1. Check for specific token in the user's balance
      const token =
        balances.tokens?.find(
          (t) =>
            t.symbol.toUpperCase() === tokenSymbol.toUpperCase() &&
            Number(t.balance) > 0,
        ) ||
        balances.tokens?.find(
          (t) => t.symbol.toUpperCase() === tokenSymbol.toUpperCase(),
        );

      if (token && Number(token.balance) > 0) {
        return `$${Number(token.balance).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      // 2. If token balance is 0 or not found, fall back to totalUsd (matching balance-sheet.tsx)
      if (balances.totalUsd && Number(balances.totalUsd) > 0) {
        return `$${Number(balances.totalUsd).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
    }

    // 3. Fallback directly to Stellar Horizon if stellarAddress is available
    if (stellarAddress && stellarAddress.startsWith("G")) {
      const stellar = await fetchStellarBalances(stellarAddress);
      const testnetUsdc = Number(stellar.testnet?.usdc || 0);
      const mainnetUsdc = Number(stellar.mainnet?.usdc || 0);
      const totalUsdc = testnetUsdc > 0 ? testnetUsdc : mainnetUsdc;
      if (totalUsdc > 0) {
        return `$${totalUsdc.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
    }

    return "$0.00";
  } catch (err) {
    console.warn("[ToolExecutor] Error fetching actual user balance:", err);
    return "$0.00";
  }
}

export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  userCtx: {
    stellarAddress: string;
    userId?: string;
  },
): Promise<ToolResult> {
  const name = toolName as JumpaToolName;
  const userId = userCtx.userId || "UNKNOWN";

  switch (name) {
    case "analyze_image": {
      const { imageUrl, question } = toolArgs as {
        imageUrl: string;
        question?: string;
      };

      if (!imageUrl) {
        return {
          toolName: name,
          summaryForAI: "No image URL provided to analyze.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const result = await analyzeImageWithGemini(imageUrl, question);
      return {
        toolName: name,
        summaryForAI: result.analysis,
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Stellar Testnet Swap Quote
    // ── Cross-chain Bridge Quote (Circle CCTP v2) — multi-step interactive flow
    case "bridge_tokens": {
      const { fromToken, toToken, amount, fromChain, toChain } = toolArgs as {
        fromToken?: string;
        toToken?: string;
        amount?: string;
        fromChain?: string;
        toChain?: string;
      };

      const parsedFromChain = parseBridgeChain(fromChain);
      const parsedToChain = parseBridgeChain(toChain);

      let cleanAmount: string | null = null;
      if (amount && typeof amount === "string") {
        const cleaned = amount.replace(/[^0-9.]/g, "");
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 0) {
          cleanAmount = cleaned;
        }
      }

      // Step 1: Source chain picker
      if (!parsedFromChain) {
        const options = await getBridgeSourceChainOptions(
          userId,
          userCtx.stellarAddress,
          parsedToChain,
        );

        return {
          toolName: name,
          summaryForAI: "Select the network you want to bridge from.",
          cardHint: {
            type: "options",
            data: { options },
          },
          requiresConfirmation: false,
        };
      }

      // Step 2: Destination chain picker
      if (!parsedToChain || parsedToChain === parsedFromChain) {
        const fromDisplayName = getBridgeChainDisplayName(parsedFromChain);
        return {
          toolName: name,
          summaryForAI: `Bridging from **${fromDisplayName}** — select the network to receive the funds.`,
          cardHint: {
            type: "options",
            data: { options: bridgeDestChains(parsedFromChain) },
          },
          requiresConfirmation: false,
        };
      }

      const fromDisplayName = getBridgeChainDisplayName(parsedFromChain);
      const toDisplayName = getBridgeChainDisplayName(parsedToChain);

      // Step 3: Amount picker (prelisted options + custom amount option)
      if (!cleanAmount) {
        return {
          toolName: name,
          summaryForAI: `Select or enter the amount of **USDC** to bridge from **${fromDisplayName}** to **${toDisplayName}**.`,
          cardHint: {
            type: "options",
            data: { options: BRIDGE_AMOUNTS },
          },
          requiresConfirmation: false,
        };
      }

      // Step 4: All required parameters provided. Connect wallet and generate quote proposal.
      await connectDB();
      let wallet = null;
      if (userId && userId !== "UNKNOWN") {
        wallet = await Wallet.findOne({ userId });
      }
      const stellarAddr =
        wallet?.addresses?.xlm || userCtx.stellarAddress || "";
      const evmAddr =
        wallet?.addresses?.base || wallet?.addresses?.eth || "";

      let quote: ReturnType<typeof getBridgeQuote>;
      try {
        quote = getBridgeQuote({
          fromToken: "USDC",
          toToken: "USDC",
          amount: cleanAmount,
          fromChain: parsedFromChain,
          toChain: parsedToChain,
        });
      } catch (err: any) {
        return {
          toolName: name,
          summaryForAI:
            err?.message || "That bridge route is not available right now.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const recipientAddress =
        quote.toChain === "stellar" ? stellarAddr : evmAddr;

      const cardData: BridgeCard = {
        title: "Bridge",
        status: { lead: "Arrival ", value: quote.estimatedTime || "~20s" },
        pay: {
          caption: "YOU PAY",
          value: quote.amountIn,
          badge: quote.fromToken,
          chain: quote.fromChain,
        },
        receive: {
          caption: "YOU RECEIVE",
          value: quote.amountOut,
          badge: quote.toToken,
          chain: quote.toChain,
        },
        stats: [
          { lead: "Rate ", value: quote.rate },
          { lead: "Fee ", value: quote.fee === "0.00" ? "0.00 USDC" : quote.fee },
        ],
      };

      return {
        toolName: name,
        summaryForAI:
          "The bridge quote card is displayed on the screen. Ask the user to review the details and confirm if they would like to proceed. Do NOT re-list the amounts, rates, or fees in your response.",
        cardHint: { type: "bridge", data: cardData },
        transactionParams: {
          type: "bridge",
          fromToken: quote.fromToken,
          toToken: quote.toToken,
          fromAmount: quote.amountIn,
          toAmount: quote.amountOut,
          fromChain: quote.fromChain,
          toChain: quote.toChain,
          currency: quote.fromToken,
          fee: quote.fee,
          provider: quote.provider || "Circle CCTP v2",
          recipientAddress,
          transferType: "fast",
        },
        requiresConfirmation: true,
      };
    }

    // Walks the user through network, pair and amount, one card per answer,
    // then hands over to the quote tool for the network they picked.
    case "swap_tokens": {
      const { network, fromToken, toToken, amount } = toolArgs as {
        network?: string;
        fromToken?: string;
        toToken?: string;
        amount?: string;
      };

      const chosen = network?.toLowerCase().trim();
      if (chosen !== "testnet" && chosen !== "mainnet") {
        return {
          toolName: name,
          summaryForAI: "Which network should the swap run on?",
          cardHint: { type: "options", data: { options: SWAP_NETWORKS } },
          requiresConfirmation: false,
        };
      }

      const asset = (value?: string) => {
        const upper = value?.toUpperCase().trim();
        return SWAP_ASSETS.find((token) => token === upper);
      };

      const from = asset(fromToken);
      if (!from) {
        return {
          toolName: name,
          summaryForAI: "Which token are they swapping from?",
          cardHint: { type: "options", data: { options: swapFromOptions() } },
          requiresConfirmation: false,
        };
      }

      const to = asset(toToken);
      if (!to || to === from) {
        return {
          toolName: name,
          summaryForAI: `Swapping **${from}** — which token should they receive?`,
          cardHint: {
            type: "options",
            data: { options: swapToOptions(from) },
          },
          requiresConfirmation: false,
        };
      }

      const size = Number(amount?.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(size) || size <= 0) {
        return {
          toolName: name,
          summaryForAI: `How much **${from}** should be swapped for **${to}**?`,
          cardHint: {
            type: "options",
            data: { options: swapAmountOptions(from) },
          },
          requiresConfirmation: false,
        };
      }

      // Pre-check user balance on Stellar
      if (userCtx.stellarAddress && userCtx.stellarAddress.startsWith("G")) {
        try {
          const stellar = await fetchStellarBalances(userCtx.stellarAddress);
          const netBals = chosen === "testnet" ? stellar.testnet : stellar.mainnet;
          const availStr =
            from === "XLM" ? netBals?.native : (netBals as any)?.[from.toLowerCase()];
          if (availStr !== undefined) {
            const avail = Number.parseFloat(availStr);
            if (Number.isFinite(avail) && size > avail) {
              const formattedAvail = avail.toFixed(2);
              return {
                toolName: name,
                summaryForAI: `Insufficient ${from} balance: The user has ${formattedAvail} ${from} on Stellar ${chosen}, but asked to swap ${size} ${from}. Inform the user they only have ${formattedAvail} ${from} and ask if they want to swap ${formattedAvail} ${from} or a smaller amount.`,
                cardHint: {
                  type: "options",
                  data: {
                    options:
                      avail > 0
                        ? [
                          {
                            label: `Swap all (${formattedAvail} ${from})`,
                            reply: `Swap ${formattedAvail} ${from} to ${to} on Stellar ${chosen}`,
                          },
                          {
                            label: `Swap half (${(avail / 2).toFixed(2)} ${from})`,
                            reply: `Swap ${(avail / 2).toFixed(2)} ${from} to ${to} on Stellar ${chosen}`,
                          },
                        ]
                        : [],
                  },
                },
                requiresConfirmation: false,
              };
            }
          }
        } catch (err) {
          console.warn("[swap_tokens] Balance pre-check error:", err);
        }
      }

      return {
        toolName: name,
        summaryForAI:
          `Every detail is known: ${size} ${from} to ${to} on Stellar ${chosen}. ` +
          `Now call stellar_${chosen}_swap_quote with fromToken "${from}", ` +
          `toToken "${to}" and fromAmount "${size}". Say nothing to the user first.`,
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    case "stellar_testnet_swap_quote":
    case "stellar_mainnet_swap_quote": {
      const network = getNetworkFromToolName(name);
      const { fromToken, toToken, fromAmount } = toolArgs as {
        fromToken: string;
        toToken: string;
        fromAmount: string;
      };

      // Pre-check balance before creating quote card
      if (userCtx.stellarAddress && userCtx.stellarAddress.startsWith("G")) {
        try {
          const stellar = await fetchStellarBalances(userCtx.stellarAddress);
          const netBals = network === "testnet" ? stellar.testnet : stellar.mainnet;
          const tokenKey =
            fromToken.toUpperCase() === "XLM" ? "native" : fromToken.toLowerCase();
          const availStr = (netBals as any)?.[tokenKey];
          if (availStr !== undefined) {
            const avail = Number.parseFloat(availStr);
            const needed = Number.parseFloat(fromAmount);
            if (Number.isFinite(avail) && Number.isFinite(needed) && needed > avail) {
              const formattedAvail = avail.toFixed(2);
              return {
                toolName: name,
                summaryForAI: `Insufficient ${fromToken} balance: The user has ${formattedAvail} ${fromToken} on Stellar ${network}, but requested to swap ${fromAmount} ${fromToken}. Inform the user they only have ${formattedAvail} ${fromToken} and ask if they'd like to swap an amount up to ${formattedAvail} ${fromToken} instead. Do not display a quote card.`,
                cardHint: {
                  type: "options",
                  data: {
                    options:
                      avail > 0
                        ? [
                          {
                            label: `Swap all (${formattedAvail} ${fromToken})`,
                            reply: `Swap ${formattedAvail} ${fromToken} to ${toToken} on Stellar ${network}`,
                          },
                          {
                            label: `Swap half (${(avail / 2).toFixed(2)} ${fromToken})`,
                            reply: `Swap ${(avail / 2).toFixed(2)} ${fromToken} to ${toToken} on Stellar ${network}`,
                          },
                        ]
                        : [],
                  },
                },
                requiresConfirmation: false,
              };
            }
          }
        } catch (balErr) {
          console.warn("[swap_quote] Balance pre-check error:", balErr);
        }
      }

      let quote: SwapQuote;
      try {
        quote = await getSwapQuote({
          chain: "stellar",
          assetIn: fromToken,
          assetOut: toToken,
          amount: fromAmount,
          slippageTolerance: 0.5,
          network,
        });
      } catch (err: any) {
        const msg =
          err?.message?.includes("liquidity") ||
            err?.message?.includes("few_offers")
            ? `There isn't enough liquidity in the Stellar ${network} orderbook for **${fromAmount} ${fromToken} → ${toToken}**. Try a smaller amount like **5–10 ${fromToken}**.`
            : `Failed to fetch a swap quote on Stellar ${network}: ${err?.message || "Unknown error"}. The pair may not be tradeable right now.`;
        return {
          toolName: name,
          summaryForAI: msg,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const cardData: QuoteCardData = {
        title: "Swap",
        status: { lead: "", value: "" },
        pay: { caption: "YOU PAY", value: quote.amountIn, badge: fromToken },
        receive: {
          caption: "YOU RECEIVE",
          value: quote.amountOut,
          badge: toToken,
        },
        stats: [
          { lead: "Rate ", value: quote.rate },
          { lead: "Est. Fee ", value: quote.estimatedFee },
        ],
        _rawQuote: quote,
        network,
        chain: "stellar",
      };

      return {
        toolName: name,
        summaryForAI:
          "The swap quote card has been shown to the user. Direct the user to review the quote and confirm to proceed. Do NOT re-list the amounts, rates, slippage, or fees in your response.",
        cardHint: { type: "quote", data: cardData },
        transactionParams: {
          type: "swap",
          fromToken,
          toToken,
          fromAmount: quote.amountIn,
          toAmount: quote.amountOut,
          chain: "stellar",
          network,
          currency: fromToken,
          protocol: quote.protocol,
        },
        requiresConfirmation: true,
      };
    }

    // ── Stellar Balance
    case "stellar_testnet_balance":
    case "stellar_mainnet_balance": {
      const network = getNetworkFromToolName(name);
      const providedAddress = String(toolArgs.address || "").trim();
      const targetAddress =
        providedAddress.startsWith("G") && providedAddress.length === 56
          ? providedAddress
          : userCtx.stellarAddress;

      if (!targetAddress || !targetAddress.startsWith("G")) {
        return {
          toolName: name,
          summaryForAI: "Invalid Stellar public key.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      let balances: { native: string; usdc: string; usdt: string };
      try {
        const result = await fetchStellarBalances(targetAddress);
        balances = network === "testnet" ? result.testnet : result.mainnet;
      } catch {
        return {
          toolName: name,
          summaryForAI: `Failed to fetch Stellar ${network} balance for ${targetAddress}. The account may not be activated yet.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      return {
        toolName: name,
        summaryForAI: [
          `Stellar ${network} balances for ${targetAddress}:`,
          `- XLM: ${balances.native} XLM`,
          `- USDC: ${balances.usdc} USDC`,
        ].join("\n"),
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Portfolio
    case "check_portfolio": {
      return {
        toolName: name,
        summaryForAI:
          "Portfolio balances are available in the user context. Use the balances already provided in the system prompt to answer the user.",
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Send Funds
    case "send_funds": {
      const amount = String(toolArgs.amount || "0");
      const token = String(toolArgs.token || "XLM").toUpperCase();
      const chain = String(toolArgs.chain || "stellar").toLowerCase();
      const network = (toolArgs.network || "testnet") as "testnet" | "mainnet";

      let recipient = String(toolArgs.recipient || "").trim();
      if (
        !recipient ||
        recipient.toLowerCase().includes("my wallet") ||
        recipient.toLowerCase().includes("myself")
      ) {
        recipient = userCtx.stellarAddress;
      }

      console.log(`[ToolExecutor] [User: ${userId}] send_funds draft:`, {
        amount,
        token,
        recipient,
        chain,
        network,
      });

      const actualBalance = await getActualUserBalance(
        userCtx.userId,
        userCtx.stellarAddress,
        token,
      );

      const cardData = {
        title: "Transfer Funds",
        contact: {
          name:
            recipient.length > 20
              ? `${recipient.slice(0, 8)}...${recipient.slice(-6)}`
              : recipient,
          handle: recipient.startsWith("G")
            ? `${recipient.slice(0, 6)}...${recipient.slice(-6)}`
            : recipient.startsWith("@")
              ? recipient
              : `@${recipient}`,
          avatar:
            "https://res.cloudinary.com/dyedbeksr/image/upload/v1763964534/Group_1000003624_nrunnu.png",
        },
        amount: { caption: "YOU'LL SEND", value: `${amount} ${token}` },
        prompt: "Confirm transfer details",
        options: [{ symbol: token, balance: actualBalance, amount, selected: true }],
      };

      return {
        toolName: name,
        summaryForAI: `Transfer card shown for sending ${amount} ${token} to ${recipient} on Stellar ${network}. Tell the user to confirm to proceed. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
        cardHint: { type: "transfer", data: cardData },
        transactionParams: {
          type: "transfer",
          amount,
          token,
          chain,
          network,
          recipient,
        },
        requiresConfirmation: true,
      };
    }

    // ── SEP-24 Hosted Anchor Sandbox
    case "stellar_sep24_sandbox": {
      const {
        assetCode = "USDC",
        type = "deposit",
        amount = "50",
        anchorName = "MoneyGram / TestAnchor",
      } = toolArgs as {
        assetCode?: string;
        type?: "deposit" | "withdraw";
        amount?: string;
        anchorName?: string;
      };

      let stellarAddress = userCtx?.stellarAddress;
      let userName = "Jumpa User";
      let userEmail = "user@jumpa.cash";

      if (userId) {
        const [wallet, user] = await Promise.all([
          Wallet.findOne({ userId }),
          User.findOne({ $or: [{ _id: userId }, { id: userId }] }),
        ]);

        if (!stellarAddress && wallet) {
          stellarAddress = wallet.addresses?.xlm || wallet.address;
        }
        if (user) {
          if (user.name) userName = user.name;
          if (user.email) userEmail = user.email;
        }
      }

      if (!stellarAddress) {
        stellarAddress =
          "GB25HBRJWZBPWKKGXW5BAOWYFUENSV5JHVDAS4TA43FULA4WU2QJDYMZ";
      }

      const cardData = {
        anchorName,
        assetCode,
        account: stellarAddress,
        userName,
        userEmail,
        type,
        amount,
      };

      return {
        toolName: "stellar_sep24_sandbox",
        summaryForAI:
          `Initialized sandboxed SEP-24 ${type} interactive window for ${amount} ${assetCode} via ${anchorName} on Stellar Testnet for account ${stellarAddress}. ` +
          `The interactive sandbox UI Sheet is now ready for user interaction.`,
        cardHint: {
          type: "sep24",
          data: cardData,
        },
        requiresConfirmation: false,
      };
    }

    // ── Onramp NGN — powered by Switch
    case "onramp_ngn": {
      const { fiatAmount, cryptoAmount, cryptoToken, asset, walletAddress } = toolArgs as {
        fiatAmount?: string;
        cryptoAmount?: string;
        cryptoToken: string;
        asset: string;
        walletAddress: string;
      };

      console.log(
        `[ToolExecutor] [User: ${userId}] onramp_ngn → ${JSON.stringify({
          fiatAmount,
          cryptoAmount,
          cryptoToken,
          asset,
          walletAddress,
        })}`,
      );

      let cardData;
      let summaryForAI: string;

      try {
        const cleanAsset = String(asset || "").toLowerCase();
        const isStellar = cleanAsset.includes("stellar");
        if (cleanAsset.includes("base") && cleanAsset.includes("usdt")) {
          throw new Error("USDT is not supported on Base. Please choose Solana or Ethereum for USDT.");
        }

        let amount: number;
        const cleanFiat = fiatAmount
          ? Number(String(fiatAmount).replace(/[^\d.]/g, ""))
          : 0;
        const cleanCrypto = cryptoAmount
          ? Number(String(cryptoAmount).replace(/[^\d.]/g, ""))
          : 0;

        if (cleanFiat > 0) {
          amount = Math.round(cleanFiat);
        } else if (cleanCrypto > 0) {
          if (isStellar) {
            const quote = await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: cleanCrypto });
            amount = Math.round(Number(quote.estimatedReceivableAmount) || 0);
          } else {
            const rateRes = await SwitchService.getOnrampRate(asset);
            if (!rateRes.success || !rateRes.rate) {
              throw new Error(
                rateRes.message || "Failed to fetch live onramp exchange rate"
              );
            }
            amount = Math.round(cleanCrypto * rateRes.rate);
            console.log(
              `[ToolExecutor] [User: ${userId}] Computed onramp fiat amount: ₦${amount.toLocaleString()} for ${cleanCrypto} ${cryptoToken} (Rate: ₦${rateRes.rate})`
            );
          }
        } else {
          throw new Error("Please specify the amount in Naira (fiatAmount) or crypto (cryptoAmount).");
        }

        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid onramp amount");
        }

        let deposit: any;
        let reference: string;
        let destinationAmount: string;
        let providerName: "switch" | "centiiv";

        if (isStellar) {
          providerName = "centiiv";
          const res = await createCentiivOnramp({
            fiatAmount: amount,
            destinationAddress: walletAddress,
            senderName: "Jumpa User",
            senderEmail: "user@jumpa.cash",
            senderPhone: "0000000000",
            userId,
          });

          reference = res.id;
          deposit = { //centiiv returns accountNumber and not virtualAccountNumber..
            bank_name: res.temporaryWallet?.bankName || "",
            account_name: res.temporaryWallet?.accountName || "",
            account_number: res.temporaryWallet?.accountNumber || "",
            note: "Transfer the exact amount from a bank account in your own name.",
          };

          if (cleanFiat > 0) {
            const quote = await getCentiivQuote({ fromAsset: "NGN", toAsset: "USDC", amount: cleanFiat });
            destinationAmount = quote.estimatedReceivableAmount || "0";
          } else {
            destinationAmount = String(cleanCrypto);
          }
        } else {
          providerName = "switch";
          const result = await SwitchService.initiateOnRamp(
            amount,
            asset,
            walletAddress,
          );
          console.log(
            `[ToolExecutor] [User: ${userId}] onramp_ngn ← Switch result: ${JSON.stringify(result)}`,
          );

          if (!result.success || !result.data) {
            throw new Error(result.message || "Switch onramp failed");
          }

          deposit = result.data.deposit;
          reference = result.data.reference;
          destinationAmount = String(result.data.destination.amount);
        }

        // Record in ledger tied to authenticated user
        try {
          await connectDB();
          await Transaction.create({
            userId,
            type: "ONRAMP",
            status: "PENDING",
            chain: mapAssetToTxChain(asset),
            network: "mainnet",
            fromAddress: isStellar ? "CENTIIV_NGN_BANK" : "SWITCH_NGN_BANK",
            toAddress: walletAddress,
            amount: destinationAmount,
            token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
            txHash: reference,
            feePaid: "0",
            rampDetails: {
              provider: providerName,
              fiatCurrency: "NGN",
              fiatAmount: amount,
              reference,
            },
            executedAt: new Date(),
          });
          console.log(
            `[ToolExecutor] [User: ${userId}] Transaction saved: ${reference}`,
          );
        } catch (dbErr: any) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] DB record notice:`,
            dbErr.message,
          );
        }

        const finalFiatAmount = String(amount);
        cardData = {
          title: "Buy Crypto / Deposit",
          fiatAmount: finalFiatAmount,
          fiatCurrency: "NGN",
          cryptoAmount: destinationAmount,
          cryptoToken,
          bankName: deposit.bank_name,
          accountName: deposit.account_name,
          accountNumber: deposit.account_number,
          reference,
          asset,
          notes: deposit.note,
          status: "pending",
          provider: providerName,
        };

        summaryForAI =
          `Onramp initiated via ${isStellar ? "Centiiv" : "Switch"}. User should transfer ₦${amount.toLocaleString()} to ${deposit.bank_name} ` +
          `account ${deposit.account_number} (${deposit.account_name}). ` +
          `They will receive ${destinationAmount} ${cryptoToken} on ${asset.split(":")[0]}. ` +
          `Reference: ${reference}.`;

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "onramp", data: cardData },
          transactionParams: {
            type: "onramp",
            fiatAmount: finalFiatAmount,
            fiatCurrency: "NGN",
            cryptoToken,
            asset,
          },
          requiresConfirmation: true,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] onramp_ngn ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to initiate onramp: ${err.message}`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // ── Onramp NGN Custom (e.g. NGN -> XLM) — powered by Centiiv + Jumpa Treasury Float Fulfillment
    case "onramp_ngn_custom": {
      const { fiatAmount, cryptoAmount, targetToken = "XLM", walletAddress } = toolArgs as {
        fiatAmount?: string;
        cryptoAmount?: string;
        targetToken?: string;
        walletAddress?: string;
      };

      console.log(
        `[ToolExecutor] [User: ${userId}] onramp_ngn_custom → ${JSON.stringify({
          fiatAmount,
          cryptoAmount,
          targetToken,
          walletAddress,
        })}`,
      );

      let cardData;
      let summaryForAI: string;

      try {
        const tokenUpper = (targetToken || "XLM").toUpperCase();
        if (tokenUpper !== "XLM") {
          throw new Error(`Currently only XLM is supported for custom onramp. Received: ${tokenUpper}`);
        }

        // 1. Resolve user's Stellar wallet address
        let recipientAddress = walletAddress || userCtx?.stellarAddress;
        let userName = "Jumpa User";
        let userEmail = "user@jumpa.cash";

        if (userId) {
          const [wallet, user] = await Promise.all([
            Wallet.findOne({ userId }),
            User.findOne({ $or: [{ _id: userId }, { id: userId }] }),
          ]);

          if (!recipientAddress && wallet) {
            recipientAddress = wallet.addresses?.xlm || wallet.address;
          }
          if (user) {
            if (user.name) userName = user.name;
            if (user.email) userEmail = user.email;
          }
        }

        if (!recipientAddress) {
          throw new Error("Unable to resolve your Stellar wallet address. Please ensure your wallet is initialized.");
        }

        // 2. Fetch live crypto rates (XLM/USD)
        const { tokens } = await getLiveRates();
        const xlmRate = tokens.find((t) => t.symbol.toUpperCase() === "XLM");
        const xlmUsdPrice = xlmRate?.usd && xlmRate.usd > 0 ? xlmRate.usd : 0.12;

        let cleanFiat: number;
        let finalCryptoAmount: string;
        let expectedUsdcAmount: number;

        const rawFiat = fiatAmount ? Number(String(fiatAmount).replace(/[^\d.]/g, "")) : 0;
        const rawCrypto = cryptoAmount ? Number(String(cryptoAmount).replace(/[^\d.]/g, "")) : 0;

        if (rawFiat > 0) {
          cleanFiat = Math.round(rawFiat);
          // Query Centiiv NGN -> USDC
          const quote = await getCentiivQuote({ fromAsset: "NGN", toAsset: "USDC", amount: cleanFiat });
          expectedUsdcAmount = Number(quote.estimatedReceivableAmount || "0");
          if (isNaN(expectedUsdcAmount) || expectedUsdcAmount <= 0) {
            throw new Error("Unable to calculate USDC conversion from Centiiv");
          }
          // Compute XLM receivable = USDC / xlmUsdPrice
          const receivableXlm = expectedUsdcAmount / xlmUsdPrice;
          finalCryptoAmount = receivableXlm.toFixed(4);
        } else if (rawCrypto > 0) {
          finalCryptoAmount = rawCrypto.toFixed(4);
          // Compute required USDC = XLM * xlmUsdPrice
          expectedUsdcAmount = rawCrypto * xlmUsdPrice;
          // Query Centiiv USDC -> NGN
          const quote = await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: expectedUsdcAmount });
          cleanFiat = Math.round(Number(quote.estimatedReceivableAmount || "0"));
          if (isNaN(cleanFiat) || cleanFiat <= 0) {
            throw new Error("Unable to calculate NGN deposit amount from Centiiv");
          }
        } else {
          throw new Error("Please specify the deposit amount in Naira (fiatAmount) or XLM (cryptoAmount).");
        }

        if (isNaN(cleanFiat) || cleanFiat <= 0) {
          throw new Error("Invalid onramp fiat amount.");
        }

        // 3. Resolve Treasury Address for inbound Centiiv deposit
        const sponsorKey = getSponsorKeypair();
        if (!sponsorKey) {
          throw new Error("Jumpa Treasury key is not configured.");
        }
        const treasuryAddress = sponsorKey.publicKey();

        // 4. Create Centiiv Onramp Order directed to Treasury
        const res = await createCentiivOnramp({
          fiatAmount: cleanFiat,
          destinationAddress: treasuryAddress,
          senderName: userName,
          senderEmail: userEmail,
          senderPhone: "0000000000",
          userId,
        });

        console.log(
          `[ToolExecutor] [User: ${userId}] Centiiv onramp response:`,
          JSON.stringify(res, null, 2),
        );

        const reference = res.id;
        const deposit = {
          bank_name: res.temporaryWallet?.bankName || "",
          account_name: res.temporaryWallet?.accountName || "",
          account_number: res.temporaryWallet?.accountNumber || "",
        };

        // 5. Record Transaction in MongoDB
        try {
          await connectDB();
          await Transaction.create({
            userId,
            type: "ONRAMP",
            status: "PENDING",
            chain: "stellar",
            network: "mainnet",
            fromAddress: "CENTIIV_NGN_BANK",
            toAddress: recipientAddress,
            amount: finalCryptoAmount,
            token: tokenUpper,
            txHash: reference,
            feePaid: "0",
            rampDetails: {
              provider: "centiiv",
              fiatCurrency: "NGN",
              fiatAmount: cleanFiat,
              reference,
              fulfillmentAction: "CUSTOM_ONRAMP",
              targetToken: tokenUpper,
              expectedUsdc: String(expectedUsdcAmount.toFixed(4)),
              treasuryAddress,
              settlementStatus: "PENDING",
            },
            executedAt: new Date(),
          });
          console.log(
            `[ToolExecutor] [User: ${userId}] Custom onramp transaction saved: ${reference} (${finalCryptoAmount} ${tokenUpper})`,
          );
        } catch (dbErr: any) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] DB record notice for custom onramp:`,
            dbErr.message,
          );
        }

        const finalFiatStr = String(cleanFiat);
        cardData = {
          title: `Buy ${tokenUpper} with NGN`,
          fiatAmount: finalFiatStr,
          fiatCurrency: "NGN",
          cryptoAmount: finalCryptoAmount,
          cryptoToken: tokenUpper,
          bankName: deposit.bank_name,
          accountName: deposit.account_name,
          accountNumber: deposit.account_number,
          reference,
          asset: "stellar:native",
          // The card renders these as its instruction bullets, so they say what
          // the user has to do — the provider's own name is not an instruction.
          notes: [
            `Transfer exactly ₦${cleanFiat.toLocaleString()} from a bank account in your own name.`,
            `${Number(finalCryptoAmount).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${tokenUpper} is locked for this order and lands in your Jumpa Stellar wallet once the transfer confirms.`,
          ],
          status: "pending",
          provider: "centiiv",
        };

        summaryForAI =
          `Custom onramp initiated via Centiiv. User should transfer ₦${cleanFiat.toLocaleString()} to ${deposit.bank_name} ` +
          `account ${deposit.account_number} (${deposit.account_name}). ` +
          `Once the bank transfer confirms, Jumpa Treasury will instantly deliver ${finalCryptoAmount} ${tokenUpper} to their Stellar wallet (${recipientAddress}). ` +
          `Reference: ${reference}.`;

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "onramp", data: cardData },
          transactionParams: {
            type: "onramp",
            fiatAmount: finalFiatStr,
            fiatCurrency: "NGN",
            cryptoToken: tokenUpper,
            asset: "stellar:native",
          },
          requiresConfirmation: true,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] onramp_ngn_custom ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to initiate custom onramp: ${err.message}`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // ── Offramp NGN — powered by Switch + Paystack Account Verification
    case "offramp_ngn": {
      const {
        cryptoAmount,
        fiatAmount,
        cryptoToken,
        asset,
        bankName,
        accountNumber,
        holderName,
      } = toolArgs as {
        cryptoAmount?: string;
        fiatAmount?: string;
        cryptoToken?: string;
        asset?: string;
        bankName: string;
        accountNumber: string;
        holderName?: string;
      };

      console.log(
        `[ToolExecutor] [User: ${userId}] offramp_ngn → ${JSON.stringify({
          cryptoAmount,
          fiatAmount,
          cryptoToken,
          asset,
          bankName,
          accountNumber,
          providedHolderName: holderName,
        })}`,
      );

      let effectiveAsset = asset?.trim();
      let effectiveToken = cryptoToken?.trim();

      if (effectiveAsset && !effectiveToken) {
        effectiveToken = effectiveAsset.split(":")[1]?.toUpperCase() || "USDC";
      }

      // If token is specified without network/asset, check if user holds that token on exactly 1 offrampable network
      if (!effectiveAsset && effectiveToken) {
        const balances = await getCachedWalletBalances(userId);
        const matchingHoldings = (balances?.tokens || []).filter(
          (t) =>
            t.symbol.toUpperCase() === effectiveToken!.toUpperCase() &&
            Number(t.balance) > 0 &&
            isSellable(t),
        );

        if (matchingHoldings.length === 1) {
          const chain = networkToSwitchChain(matchingHoldings[0].network);
          if (chain) {
            effectiveAsset = `${chain}:${effectiveToken.toLowerCase()}`;
          }
        }
      }

      // ── The designed cash-out conversation: one chooser per missing detail,
      // so the user taps rather than being asked for token, network and bank in prose.
      let cleanedAccount = String(accountNumber || "")
        .trim()
        .replace(/\D/g, "");
      if (cleanedAccount.startsWith("234") && cleanedAccount.length === 13) {
        cleanedAccount = cleanedAccount.slice(3);
      }

      if (!effectiveAsset || !effectiveToken) {
        const balances = await getCachedWalletBalances(userId);
        const allTokens = balances?.tokens || [];
        const relevantTokens = effectiveToken
          ? allTokens.filter(
            (t) => t.symbol.toUpperCase() === effectiveToken!.toUpperCase(),
          )
          : allTokens;
        const sources = fundingOptions(
          relevantTokens.length > 0 ? relevantTokens : allTokens,
        );

        if (sources.length > 0) {
          return {
            toolName: name,
            summaryForAI: "Which balance would you like to cash out from?",
            cardHint: { type: "options", data: { options: sources } },
            requiresConfirmation: false,
          };
        }

        // Nothing sellable. Never fall back to a chain the user did not name —
        // quoting one reports an empty balance on a network they never chose.
        if (allTokens.length > 0) {
          // Testnet coins are not money. Listing them in a cash-out answer reads
          // as a balance the user could sell, so only mainnet holdings are named.
          const held = allTokens
            .filter((t) => !t.isTestnet && Number(t.balance) > 0)
            .map(
              (t) =>
                `**${formatBalance(t.balance)} ${t.symbol}**${t.network ? ` on ${t.network}` : ""}`,
            );
          const onTestnet = allTokens.some(
            (t) => t.isTestnet && Number(t.balance) > 0,
          );
          return {
            toolName: name,
            summaryForAI:
              "The user has nothing that can be cashed out to NGN. " +
              (held.length > 0
                ? `They hold ${held.join(", ")}. `
                : "Their mainnet wallets are empty. ") +
              (onTestnet
                ? "Any testnet balance they have is test money and can never be cashed out — do not quote it or convert it. "
                : "") +
              "Cash-out works from USDC on Base, Solana, Ethereum or Stellar, and USDT on Solana or Ethereum (mainnet only). " +
              "There is no exchange rate in this answer: state NO naira value and NO rate, because none was fetched. " +
              "Say so without naming one of those networks as if they had picked it, and offer to fund a wallet or swap into a sellable token.",
            cardHint: { type: "none" },
            requiresConfirmation: false,
          };
        }

        // Balances could not be read at all — ask which network rather than guessing.
        return {
          toolName: name,
          summaryForAI: "Which balance would you like to cash out from?",
          cardHint: { type: "options", data: { options: SELLABLE_ASSETS } },
          requiresConfirmation: false,
        };
      }

      if (cleanedAccount.length !== 10) {
        const saved = await lastPayoutAccount(userId).catch(() => null);
        const enterRow: ChatOption = {
          label: "Enter account number",
          custom: true,
          placeholder: "10-digit account number",
        };

        if (saved) {
          return {
            toolName: name,
            summaryForAI: "Where should I send the money?",
            cardHint: {
              type: "accounts",
              data: {
                title: "Saved Account",
                account: {
                  lines: [
                    { label: "Bank Name", value: saved.bankName || "" },
                    { label: "Account Name", value: saved.accountName || "" },
                  ],
                  field: {
                    caption: "ACCOUNT NUMBER",
                    value: saved.accountNumber || "",
                  },
                  action: {
                    label: "Confirm",
                    kind: "reply",
                    reply: `Send it to ${saved.accountNumber} at ${saved.bankName}`,
                  },
                },
                options: [enterRow],
              },
            },
            requiresConfirmation: false,
          };
        }

        return {
          toolName: name,
          summaryForAI: "Where should I send the money?",
          cardHint: { type: "options", data: { options: [enterRow] } },
          requiresConfirmation: false,
        };
      }

      if (!bankName?.trim()) {
        const candidates = await resolveBankCandidates(cleanedAccount);

        if (candidates.length > 0) {
          const options: ChatOption[] = candidates.map((entry) => ({
            label: entry.bank,
            description: entry.holder,
            reply: `${entry.bank}`,
          }));
          options.push({
            label: "Enter bank name",
            custom: true,
            placeholder: "Bank name",
          });

          return {
            toolName: name,
            summaryForAI:
              candidates.length === 1
                ? `Found **${candidates[0].holder}** at **${candidates[0].bank}**. Ask the user to confirm the bank.`
                : `I found ${candidates.length} banks with the same account number.`,
            cardHint: { type: "options", data: { options } },
            requiresConfirmation: false,
          };
        }
        // Nothing matched — fall through to the existing "bank name is required" error.
      }

      try {
        if (!bankName || !bankName.trim()) {
          throw new Error(
            "Bank name is required. Please provide your bank name (e.g. GTBank, Kuda, Access Bank, OPay, Zenith).",
          );
        }

        let cleanAccount = String(accountNumber || "")
          .trim()
          .replace(/\D/g, "");
        if (cleanAccount.startsWith("234") && cleanAccount.length === 13) {
          cleanAccount = cleanAccount.slice(3);
        }
        if (cleanAccount.length !== 10) {
          throw new Error(
            `Invalid account number "${accountNumber}". Nigerian bank account numbers must be exactly 10 digits.`,
          );
        }

        // 1. Identify Paystack bank
        const paystackBank = findPaystackBank(bankName);
        if (!paystackBank) {
          throw new Error(
            `Could not find bank matching "${bankName}". Please check the bank name (e.g. GTBank, Access Bank, Kuda, Zenith, OPay).`,
          );
        }

        console.log(
          `[ToolExecutor] [User: ${userId}] Matched Paystack Bank: "${paystackBank.name}" (${paystackBank.code})`,
        );

        // 2. Validate account number with Paystack to retrieve verified name
        const resolveRes = await validateAccountNumber(
          cleanAccount,
          paystackBank.code,
        );
        if (
          !resolveRes ||
          !resolveRes.status ||
          !resolveRes.data?.account_name
        ) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] Paystack verification failed:`,
            resolveRes?.message,
          );
          throw new Error(
            `Could not verify account number ${cleanAccount} with ${paystackBank.name}. Please ensure the 10-digit account number and bank name are correct.`,
          );
        }

        const verifiedHolderName = resolveRes.data.account_name.trim();
        console.log(
          `[ToolExecutor] [User: ${userId}] ✅ Paystack account verified: "${verifiedHolderName}" (${cleanAccount})`,
        );

        // 3. Resolve Switch bank code for Switch offramp (never use Paystack bank code for Switch!)
        const switchBank =
          resolveBankCode(bankName) || resolveBankCode(paystackBank.name);

        if (!switchBank) {
          throw new Error(
            `Bank "${paystackBank.name}" could not be matched with our settlement partner (Switch). Please check bank name.`,
          );
        }

        console.log(
          `[ToolExecutor] [User: ${userId}] Matched Switch Bank: "${switchBank.name}" (${switchBank.code})`,
        );

        const parseFlexibleAmount = (val?: string | number): number => {
          if (!val) return 0;
          const str = String(val).trim().toLowerCase();
          const kMatch = str.match(/^([\d.]+)\s*k$/);
          if (kMatch) return Number(kMatch[1]) * 1000;
          const mMatch = str.match(/^([\d.]+)\s*m$/);
          if (mMatch) return Number(mMatch[1]) * 1000000;
          return Number(str.replace(/[^\d.]/g, "")) || 0;
        };

        const cleanCrypto = parseFlexibleAmount(cryptoAmount);
        const cleanFiat = parseFlexibleAmount(fiatAmount);

        let amount: number;
        let appliedRate: number | undefined;

        const targetAsset = effectiveAsset || asset || "base:usdc";
        const targetToken =
          effectiveToken || cryptoToken || targetAsset.split(":")[1]?.toUpperCase() || "USDC";

        const cleanTargetAsset = targetAsset.toLowerCase();
        const isStellar = cleanTargetAsset.includes("stellar");
        if (cleanTargetAsset.includes("base") && cleanTargetAsset.includes("usdt")) {
          throw new Error("USDT is not supported on Base. Please choose Solana or Ethereum for USDT.");
        }

        if (cleanCrypto > 0) {
          amount = cleanCrypto;
        } else if (cleanFiat > 0) {
          if (isStellar) {
            const quote = await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: 1 });
            appliedRate = Number(quote.rate);
            amount = parseFloat((cleanFiat / appliedRate).toFixed(2));
          } else {
            const rateRes = await SwitchService.getOfframpRate(targetAsset);
            if (!rateRes.success || !rateRes.rate) {
              throw new Error(
                rateRes.message || "Failed to fetch live offramp rate for conversion",
              );
            }
            appliedRate = rateRes.rate;
            amount = parseFloat((cleanFiat / appliedRate).toFixed(2));
          }
          if (amount <= 0) {
            throw new Error("Calculated crypto amount is too small. Please enter a higher amount.");
          }
          console.log(
            `[ToolExecutor] [User: ${userId}] Computed offramp crypto amount: ${amount} ${targetToken} for ₦${cleanFiat.toLocaleString()} (Rate: ₦${appliedRate})`,
          );
        } else {
          throw new Error(
            "Please specify either the crypto amount to withdraw or the Naira amount you wish to receive.",
          );
        }

        // Check wallet balance to provide a clear error if insufficient
        try {
          let balances = await getCachedWalletBalances(userId);
          const targetChain = targetAsset.split(":")[0]?.toLowerCase();

          // Helper to match token on the specific target chain on mainnet
          const getTokenForChain = (b: typeof balances) =>
            b?.tokens?.find((t) => {
              if (t.isTestnet) return false;
              if (t.symbol.toUpperCase() !== targetToken.toUpperCase()) return false;
              const net = (t.network || "").toLowerCase();
              if (targetChain === "stellar") return net.includes("stellar");
              if (targetChain === "solana") return net.includes("solana");
              if (targetChain === "base") return net.includes("base");
              if (targetChain === "ethereum") return net.includes("ethereum") || (net.includes("mainnet") && !net.includes("stellar") && !net.includes("solana"));
              if (targetChain === "avalanche") return net.includes("avalanche");
              if (targetChain === "polygon") return net.includes("polygon");
              if (targetChain === "arbitrum") return net.includes("arbitrum");
              if (targetChain === "optimism") return net.includes("optimism");
              if (targetChain === "tron") return net.includes("tron");
              return false;
            });

          let tokenObj = getTokenForChain(balances);
          let currentBal = tokenObj ? Number(tokenObj.balance) || 0 : 0;

          // If cached balance is insufficient and token is tracked, force-refresh once to ensure fresh on-chain data
          if (tokenObj && currentBal < amount) {
            balances = await getCachedWalletBalances(userId, undefined, true);
            tokenObj = getTokenForChain(balances);
            currentBal = tokenObj ? Number(tokenObj.balance) || 0 : 0;
          }

          const chainLabel = targetChain.charAt(0).toUpperCase() + targetChain.slice(1);
          console.log(
            `[ToolExecutor] [User: ${userId}] Balance check for ${targetAsset}: found ${currentBal} ${targetToken} on ${tokenObj?.network || chainLabel}, needed: ${amount}`,
          );

          if (tokenObj && currentBal < amount) {
            // Only print a naira figure we actually have — with no rate fetched
            // this used to render a bare "₦".
            const naira = cleanFiat
              ? cleanFiat.toLocaleString()
              : appliedRate
                ? Math.round(amount * appliedRate).toLocaleString()
                : "";
            return {
              toolName: name,
              summaryForAI: `Insufficient balance: you have **${formatBalance(currentBal)} ${targetToken}** on **${chainLabel}**, but **${amount} ${targetToken}**${naira ? ` (approx. **₦${naira}**)` : ""} is required for this withdrawal. Keep every figure bold in your reply, and do not state any rate or naira value beyond the ones given here. Please fund your ${chainLabel} wallet or choose a smaller amount.`,
              cardHint: { type: "none" },
              requiresConfirmation: false,
            };
          } else if (!tokenObj) {
            console.log(
              `[ToolExecutor] [User: ${userId}] Balance check for ${targetAsset}: token not tracked in wallet balances, proceeding without blocking.`,
            );
          }
        } catch (balErr: any) {
          console.warn("[ToolExecutor] Balance pre-check notice:", balErr.message);
        }

        // 4. Initiate offramp order using the verified account name
        let deposit: any;
        let reference: string;
        let destinationAmount: number;
        let providerName: "switch" | "centiiv";

        if (isStellar) {
          providerName = "centiiv";
          const centiivBank = findCentiivBank(bankName) || findCentiivBank(paystackBank.name);
          if (!centiivBank) {
            throw new Error(`Bank account not found`);
          }
          const res = await createCentiivOfframp({
            amount: amount,
            bankCode: centiivBank.code,
            accountNumber: cleanAccount,
            accountName: verifiedHolderName,
            userId: userId,
          });

          reference = res.id;
          deposit = { amount: res.amount, address: res.temporaryWallet.publicAddress };
          const quoteRate = appliedRate || Number((await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: 1 })).rate);
          destinationAmount = amount * quoteRate;
        } else {
          providerName = "switch";
          const result = await SwitchService.initiateOfframp(
            amount,
            targetAsset,
            {
              holder_name: verifiedHolderName,
              account_number: cleanAccount,
              bank_code: switchBank.code,
            },
          );

          console.log(
            `[ToolExecutor] [User: ${userId}] offramp_ngn ← Switch result: ${JSON.stringify(result)}`,
          );

          if (!result.success || !result.data) {
            throw new Error(result.message || "Switch offramp failed");
          }

          deposit = result.data.deposit;
          reference = result.data.reference;
          destinationAmount = result.data.destination.amount;
        }

        // Record in ledger tied to authenticated user
        try {
          await connectDB();
          await Transaction.create({
            userId,
            type: "OFFRAMP",
            status: "PENDING",
            chain: mapAssetToTxChain(targetAsset),
            network: "mainnet",
            fromAddress: "USER_WALLET",
            toAddress: `${paystackBank.name} / ${cleanAccount} (${verifiedHolderName})`,
            amount: String(deposit.amount),
            token: targetToken,
            txHash: reference,
            feePaid: "0",
            rampDetails: {
              provider: providerName,
              fiatCurrency: "NGN",
              fiatAmount: destinationAmount,
              reference,
              verifiedAccountName: verifiedHolderName,
              bankName: paystackBank.name,
              accountNumber: cleanAccount,
              depositAddress: deposit.address,
            },
            executedAt: new Date(),
          });
          console.log(
            `[ToolExecutor] [User: ${userId}] Transaction saved: ${reference}`,
          );
        } catch (dbErr: any) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] DB record notice:`,
            dbErr.message,
          );
        }

        const cardData = {
          title: "Withdrawal",
          cryptoAmount: String(deposit.amount),
          cryptoToken: targetToken,
          fiatAmount: String(destinationAmount),
          fiatCurrency: "NGN",
          bankName: paystackBank.name,
          accountName: verifiedHolderName,
          accountNumber: cleanAccount,
          depositAddress: deposit.address,
          asset: targetAsset,
          reference,
          status: "pending",
          provider: providerName,
        };

        let summaryForAI =
          `Offramp draft created for ${deposit.amount} ${cardData.cryptoToken} via ${isStellar ? "Centiiv" : "Switch"}. ` +
          `Account verified via Paystack as **${verifiedHolderName}** (${paystackBank.name} - ${cleanAccount}). ` +
          `The user will receive **₦${destinationAmount.toLocaleString()}**. ` +
          `Ask the user to confirm to proceed with the withdrawal. Do NOT use emojis or tell them to click buttons.`;

        if (cleanFiat > 0 && appliedRate) {
          summaryForAI =
            `Offramp draft created: Based on your request for ₦${cleanFiat.toLocaleString()}, at the current rate of 1 ${cardData.cryptoToken} = ₦${appliedRate.toLocaleString()}, you will withdraw ${deposit.amount} ${cardData.cryptoToken}. ` +
            `Account verified via Paystack as **${verifiedHolderName}** (${paystackBank.name} - ${cleanAccount}). ` +
            `The user will receive **₦${destinationAmount.toLocaleString()}**. ` +
            `Ask the user to confirm to proceed with the withdrawal. Do NOT use emojis or tell them to click buttons.`;
        }

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "offramp", data: cardData },
          transactionParams: {
            type: "offramp",
            cryptoAmount: String(deposit.amount),
            cryptoToken: cardData.cryptoToken,
            asset: targetAsset,
            bankName: paystackBank.name,
            accountNumber: cleanAccount,
            holderName: verifiedHolderName,
            depositAddress: deposit.address,
            reference,
          },
          requiresConfirmation: true,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] offramp_ngn ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to initiate offramp: ${err.message}`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // Live Exchange Rate for NGN Ramps (Switch)
    case "get_ramp_rate": {
      const { direction = "both", asset, token = "USDC" } = toolArgs as {
        direction?: "onramp" | "offramp" | "both";
        asset?: string;
        token?: string;
      };

      // Resolve asset identifier if not explicitly provided
      const upperToken = (token || "USDC").toUpperCase();
      const targetAsset =
        asset ||
        (upperToken === "USDT"
          ? "solana:usdt"
          : upperToken === "CNGN"
            ? "base:cngn"
            : "base:usdc");
      const tokenSymbol =
        upperToken === "USDT" ? "USDT" : upperToken === "CNGN" ? "cNGN" : "USDC";

      console.log(`[ToolExecutor] [User: ${userId}] get_ramp_rate →`, {
        direction,
        asset: targetAsset,
        token: tokenSymbol,
      });

      try {
        let onrampRate: number | undefined;
        let offrampRate: number | undefined;

        const isStellar = targetAsset.toLowerCase().includes("stellar");
        if (direction === "onramp" || direction === "both") {
          if (isStellar) {
            const quote = await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: 1 });
            onrampRate = Number(quote.rate);
          } else {
            const res = await SwitchService.getOnrampRate(targetAsset);
            if (res.success && res.rate) {
              onrampRate = res.rate;
            }
          }
        }

        if (direction === "offramp" || direction === "both") {
          if (isStellar) {
            const quote = await getCentiivQuote({ fromAsset: "USDC", toAsset: "NGN", amount: 1 });
            offrampRate = Number(quote.rate);
          } else {
            const res = await SwitchService.getOfframpRate(targetAsset);
            if (res.success && res.rate) {
              offrampRate = res.rate;
            }
          }
        }

        const lines: string[] = [];
        if (onrampRate) {
          lines.push(`Deposit (Buy ${tokenSymbol}): 1 ${tokenSymbol} = ₦${onrampRate.toLocaleString()}`);
        }
        if (offrampRate) {
          lines.push(`Withdrawal (Sell ${tokenSymbol} to Bank): 1 ${tokenSymbol} = ₦${offrampRate.toLocaleString()}`);
        }

        if (lines.length === 0) {
          throw new Error("Unable to fetch current rates from provider.");
        }

        const summaryForAI =
          `Current  exchange rates for **${tokenSymbol}** (via Switch):\n` +
          lines.join("\n") +
          `\nTell the user these exact live rates clearly and concisely. Ask if they would like to proceed with a deposit or withdrawal.`;

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] get_ramp_rate ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to fetch live rates: ${err.message}. Please try again shortly.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // ── Claim Testnet Faucet (Friendbot)
    case "claim_faucet": {
      const providedAddress = String(toolArgs.walletAddress || "").trim();
      const targetAddress =
        providedAddress.startsWith("G") && providedAddress.length === 56
          ? providedAddress
          : userCtx.stellarAddress;

      if (!targetAddress || !targetAddress.startsWith("G")) {
        return {
          toolName: name,
          summaryForAI:
            "Cannot claim faucet: No valid Stellar public key (G...) found for your account.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      console.log(
        `[ToolExecutor] [User: ${userId}] claim_faucet requested for: ${targetAddress}`,
      );
      const res = await fundTestnetAccount(targetAddress);

      if (!res.success) {
        return {
          toolName: name,
          summaryForAI: `Faucet funding failed: ${res.message}. The testnet network may be busy.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      logUserActivity({
        userId,
        action: "FAUCET_REQUESTED",
        details: { targetAddress, chain: "stellar", network: "testnet" },
      }).catch(() => { });

      // Fetch fresh testnet balance
      let newBalanceText = "10,000 XLM";
      try {
        const bal = await fetchStellarBalances(targetAddress);
        newBalanceText = `${bal.testnet.native} XLM`;
      } catch {
        // Fallback
      }

      return {
        toolName: name,
        summaryForAI:
          `Successfully funded your Stellar testnet wallet (${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}) with 10,000 testnet XLM via Friendbot. ` +
          `Your active testnet balance is now **${newBalanceText}**. Your wallet is active and ready for testnet transactions!`,
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Savings goal — interactive conversational wizard
    case "create_savings_goal": {
      const {
        category,
        name: rawGoalName,
        amount,
        durationDays,
        depositAmount,
      } = toolArgs as {
        category?: string;
        name?: string;
        amount?: string;
        durationDays?: number;
        depositAmount?: string;
      };

      const KNOWN_CATEGORIES = [
        "Rent",
        "Travel",
        "Groceries",
        "Transportation",
        "Others",
        "Other",
      ];
      let chosenCategory = category?.trim();
      let goalName = rawGoalName?.trim();

      // If user provided a name that matches one of the category chips and no category was specified
      if (
        goalName &&
        !chosenCategory &&
        KNOWN_CATEGORIES.some(
          (c) => c.toLowerCase() === goalName?.toLowerCase(),
        )
      ) {
        chosenCategory =
          KNOWN_CATEGORIES.find(
            (c) => c.toLowerCase() === goalName?.toLowerCase(),
          ) || goalName;
        goalName = undefined;
      }

      // Step 1: Category chooser if neither category nor specific goal name is known
      if (!chosenCategory && !goalName) {
        return {
          toolName: name,
          summaryForAI: "Absolutely. What are you saving for?",
          cardHint: {
            type: "options",
            data: { options: SAVINGS_CATEGORIES },
          },
          requiresConfirmation: false,
        };
      }

      // Step 2: Goal name
      if (!goalName) {
        return {
          toolName: name,
          summaryForAI: "Nice. What would you like to call this goal?",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      // Step 3: Target amount
      if (!amount?.trim()) {
        return {
          toolName: name,
          summaryForAI: `Got it, **${goalName}**. How much would you like to save?`,
          cardHint: {
            type: "options",
            data: { options: SAVINGS_AMOUNTS },
          },
          requiresConfirmation: false,
        };
      }

      // Step 4: Duration
      if (!durationDays) {
        return {
          toolName: name,
          summaryForAI: "When would you like to reach your goal?",
          cardHint: {
            type: "options",
            data: { options: SAVINGS_DURATIONS },
          },
          requiresConfirmation: false,
        };
      }

      // Step 5: Initial deposit
      if (
        depositAmount === undefined ||
        depositAmount === null ||
        depositAmount === ""
      ) {
        return {
          toolName: name,
          summaryForAI: `Would you like to make an initial deposit into **${goalName}** now?`,
          cardHint: {
            type: "options",
            data: { options: SAVINGS_INITIAL_DEPOSITS },
          },
          requiresConfirmation: false,
        };
      }

      const target = Number(amount.replace(/[^0-9.]/g, ""));
      const initialDeposit =
        Number(depositAmount.replace(/[^0-9.]/g, "")) || 0;
      const weekly =
        Number.isFinite(target) && target > 0 && durationDays > 0
          ? `about **$${Math.ceil((target / durationDays) * 7).toLocaleString("en-US")} a week**`
          : "a steady amount each week";

      const actualBalance = await getActualUserBalance(
        userCtx.userId,
        userCtx.stellarAddress,
        "USDC",
      );

      const cardData = {
        contact: {
          name: goalName,
          handle: `${chosenCategory || "Savings"} • ${durationDays} days`,
          avatar: "savings",
        },
        amount: {
          caption: initialDeposit > 0 ? "INITIAL DEPOSIT" : "TARGET AMOUNT",
          value:
            initialDeposit > 0
              ? `$${initialDeposit.toFixed(2)} USDC`
              : `$${target.toLocaleString("en-US")} USDC`,
        },
        prompt: `Confirm creating saving for ${goalName}`,
        options: [
          {
            symbol: "USDC",
            balance: actualBalance,
            amount: String(initialDeposit),
            selected: true,
          },
        ],
      };

      return {
        toolName: name,
        summaryForAI:
          `Proposal created for **${goalName}** (Target: **$${target.toLocaleString("en-US")}**, ` +
          `Duration: **${durationDays} days** — ${weekly}, Initial Deposit: **$${initialDeposit.toFixed(2)}**). ` +
          `Tell the user to confirm to set up the savings goal. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
        cardHint: { type: "transfer", data: cardData },
        transactionParams: {
          type: "savings_create",
          name: goalName,
          category: chosenCategory || "Other",
          targetAmount: target,
          durationDays,
          depositAmount: initialDeposit,
        },
        requiresConfirmation: true,
      };
    }

    // ── List user's savings goals
    case "list_savings": {
      if (!userId || userId === "UNKNOWN") {
        return {
          toolName: name,
          summaryForAI: "Please log in to view your savings plans.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const plans = await listSavingsPlansByUserId(userId);
      const activePlans = plans.filter((p) => p.status === "Active");

      if (activePlans.length === 0) {
        return {
          toolName: name,
          summaryForAI:
            "You do not have any active savings goals yet. Select below to set up your first goal.",
          cardHint: {
            type: "options",
            data: {
              options: [
                {
                  label: "Create New Savings Goal",
                  reply: "I want to create a savings goal",
                },
              ],
            },
          },
          requiresConfirmation: false,
        };
      }

      const chatPlans = activePlans.map((p) =>
        toChatPlan(p, `Deposit to ${p.name}`),
      );

      const totalSaved = activePlans.reduce(
        (acc, p) => acc + (p.currentAmount || 0),
        0,
      );

      return {
        toolName: name,
        summaryForAI:
          `You have **${activePlans.length} active savings goal${activePlans.length > 1 ? "s" : ""}** ` +
          `with a total balance of **$${totalSaved.toFixed(2)} USDC**. ` +
          `Tap a goal below to deposit into it, or select Create New Savings Goal.`,
        cardHint: {
          type: "plans",
          data: {
            plans: chatPlans,
            options: [
              {
                label: "Create New Savings Goal",
                icon: "savings",
                reply: "I want to create a savings goal",
              },
            ],
          },
        },
        requiresConfirmation: false,
      };
    }

    // ── Deposit / Top-up savings goal
    case "deposit_savings": {
      if (!userId || userId === "UNKNOWN") {
        return {
          toolName: name,
          summaryForAI: "Please log in to deposit into savings.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const { planName, planId, amount } = toolArgs as {
        planName?: string;
        planId?: string;
        amount?: string;
      };

      const plans = await listSavingsPlansByUserId(userId);
      const activePlans = plans.filter(
        (p) => p.status === "Active" && p.kind !== "lock",
      );

      if (activePlans.length === 0) {
        return {
          toolName: name,
          summaryForAI:
            "You do not have any active flexible savings plans available for top-up. Would you like to create one?",
          cardHint: {
            type: "options",
            data: {
              options: [
                {
                  label: "Create New Savings Goal",
                  icon: "savings",
                  reply: "I want to create a savings goal",
                },
              ],
            },
          },
          requiresConfirmation: false,
        };
      }

      // Find selected plan
      let targetPlan = planId
        ? activePlans.find((p) => String(p._id) === planId)
        : planName
          ? activePlans.find(
            (p) => p.name.toLowerCase() === planName.toLowerCase(),
          ) ||
          activePlans.find((p) =>
            p.name.toLowerCase().includes(planName.toLowerCase()),
          )
          : undefined;

      // If multiple plans and none explicitly matched, present chooser
      if (!targetPlan) {
        if (activePlans.length === 1) {
          targetPlan = activePlans[0];
        } else {
          return {
            toolName: name,
            summaryForAI: "Which savings goal would you like to deposit into?",
            cardHint: {
              type: "plans",
              data: {
                plans: activePlans.map((p) =>
                  toChatPlan(p, `Deposit to ${p.name}`),
                ),
              },
            },
            requiresConfirmation: false,
          };
        }
      }

      // If amount not provided, show quick amounts chooser
      if (!amount?.trim()) {
        return {
          toolName: name,
          summaryForAI: `How much would you like to deposit into **${targetPlan.name}**?`,
          cardHint: {
            type: "options",
            data: { options: SAVINGS_DEPOSIT_QUICK_AMOUNTS },
          },
          requiresConfirmation: false,
        };
      }

      const numAmount = Number(amount.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return {
          toolName: name,
          summaryForAI: "Please enter a valid deposit amount.",
          cardHint: {
            type: "options",
            data: { options: SAVINGS_DEPOSIT_QUICK_AMOUNTS },
          },
          requiresConfirmation: false,
        };
      }

      const actualBalance = await getActualUserBalance(
        userCtx.userId,
        userCtx.stellarAddress,
        "USDC",
      );

      const cardData = {
        contact: {
          name: targetPlan.name,
          handle: `Current: $${(targetPlan.currentAmount || 0).toFixed(2)} • Target: $${(targetPlan.targetAmount || 0).toFixed(2)}`,
          avatar: "savings",
        },
        amount: {
          caption: "YOU'LL DEPOSIT",
          value: `$${numAmount.toFixed(2)} USDC`,
        },
        prompt: `Confirm deposit to ${targetPlan.name}`,
        options: [
          {
            symbol: "USDC",
            balance: actualBalance,
            amount: String(numAmount),
            selected: true,
          },
        ],
      };

      return {
        toolName: name,
        summaryForAI:
          `Deposit proposal prepared for **$${numAmount.toFixed(2)} USDC** into **${targetPlan.name}**. ` +
          `Tell the user to confirm to proceed. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
        cardHint: { type: "transfer", data: cardData },
        transactionParams: {
          type: "savings_deposit",
          planId: String(targetPlan._id),
          planName: targetPlan.name,
          amount: numAmount,
        },
        requiresConfirmation: true,
      };
    }

    // ── Withdraw from savings goal
    case "withdraw_savings": {
      if (!userId || userId === "UNKNOWN") {
        return {
          toolName: name,
          summaryForAI: "Please log in to withdraw from your savings.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const { planName, planId, amount } = toolArgs as {
        planName?: string;
        planId?: string;
        amount?: string;
      };

      const plans = await listSavingsPlansByUserId(userId);
      const fundedPlans = plans.filter((p) => (p.currentAmount || 0) > 0);

      if (fundedPlans.length === 0) {
        return {
          toolName: name,
          summaryForAI:
            "You do not have any savings plans with an available balance to withdraw.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      let targetPlan = planId
        ? fundedPlans.find((p) => String(p._id) === planId)
        : planName
          ? fundedPlans.find(
            (p) => p.name.toLowerCase() === planName.toLowerCase(),
          ) ||
          fundedPlans.find((p) =>
            p.name.toLowerCase().includes(planName.toLowerCase()),
          )
          : undefined;

      if (!targetPlan) {
        if (fundedPlans.length === 1) {
          targetPlan = fundedPlans[0];
        } else {
          return {
            toolName: name,
            summaryForAI:
              "Which savings goal would you like to withdraw from?",
            cardHint: {
              type: "plans",
              data: {
                plans: fundedPlans.map((p) =>
                  toChatPlan(p, `Withdraw from ${p.name}`),
                ),
              },
            },
            requiresConfirmation: false,
          };
        }
      }

      const balance = targetPlan.currentAmount || 0;

      // If amount not provided, show options
      if (!amount?.trim()) {
        const withdrawOptions: ChatOption[] = [
          {
            label: `Full Balance ($${balance.toFixed(2)})`,
            reply: `$${balance.toFixed(2)}`,
          },
          {
            label: `50% ($${(balance * 0.5).toFixed(2)})`,
            reply: `$${(balance * 0.5).toFixed(2)}`,
          },
          {
            label: "Custom Amount",
            custom: true,
            placeholder: `Amount (Max $${balance.toFixed(2)})`,
          },
        ];
        return {
          toolName: name,
          summaryForAI: `How much would you like to withdraw from **${targetPlan.name}**? Available balance: **$${balance.toFixed(2)} USDC**.`,
          cardHint: {
            type: "options",
            data: { options: withdrawOptions },
          },
          requiresConfirmation: false,
        };
      }

      const numAmount = Number(amount.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return {
          toolName: name,
          summaryForAI: "Please provide a valid withdrawal amount.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      if (numAmount > balance) {
        return {
          toolName: name,
          summaryForAI: `Requested amount (**$${numAmount.toFixed(2)}**) exceeds available balance of **$${balance.toFixed(2)} USDC** in **${targetPlan.name}**.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      let penalty = 0;
      const now = new Date();
      if (
        targetPlan.kind === "lock" &&
        targetPlan.endDate &&
        now < new Date(targetPlan.endDate)
      ) {
        penalty = Number(
          (
            (numAmount * (targetPlan.penaltyFeePercent || 5)) /
            100
          ).toFixed(2),
        );
      }
      const netPayout = Number((numAmount - penalty).toFixed(2));

      const actualBalance = await getActualUserBalance(
        userCtx.userId,
        userCtx.stellarAddress,
        "USDC",
      );

      const cardData = {
        contact: {
          name: targetPlan.name,
          handle:
            penalty > 0
              ? `Early lock withdrawal (5% penalty: -$${penalty.toFixed(2)})`
              : `Net payout to wallet: $${netPayout.toFixed(2)} USDC`,
          avatar: "savings",
        },
        amount: {
          caption: "YOU'LL RECEIVE",
          value: `$${netPayout.toFixed(2)} USDC`,
        },
        prompt: `Confirm withdrawal from ${targetPlan.name}`,
        options: [
          {
            symbol: "USDC",
            balance: actualBalance,
            amount: String(netPayout),
            selected: true,
          },
        ],
      };

      return {
        toolName: name,
        summaryForAI:
          `Withdrawal proposal prepared for **$${numAmount.toFixed(2)} USDC** from **${targetPlan.name}** ` +
          `(Net payout: **$${netPayout.toFixed(2)} USDC**${penalty > 0 ? `, including early penalty of **$${penalty.toFixed(2)}**` : ""}). ` +
          `Tell the user to confirm to process the withdrawal. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
        cardHint: { type: "transfer", data: cardData },
        transactionParams: {
          type: "savings_withdraw",
          planId: String(targetPlan._id),
          planName: targetPlan.name,
          amount: numAmount,
          penaltyFee: penalty,
          netPayout,
        },
        requiresConfirmation: true,
      };
    }

    default:
      return {
        toolName,
        summaryForAI: `Unknown tool: ${toolName}. Could not execute.`,
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
  }
}

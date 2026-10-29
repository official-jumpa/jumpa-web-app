import { connectDB } from "@/lib/db";
import { Transaction, ITransaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { NgnAccount } from "@/models/NgnAccount";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { getBaseTransactionFields } from "@/lib/functions/transactionFunctions";
import { generateStatementId } from "@/lib/schema-ids";
import type { StatementRequestInput } from "@/lib/validations/statement.validation";

export interface StatementTransactionRow {
  id: string;
  displayId: string;
  date: string;
  timestamp: number;
  description: string;
  type: string;
  formattedType: string;
  direction: "inflow" | "outflow" | "neutral";
  debit: string;
  credit: string;
  amount: string;
  rawAmount: number;
  token: string;
  status: string;
  reference: string;
}

export interface CurrencySummary {
  currency: string;
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  count: number;
}

export interface StatementData {
  statementId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  currency: "all" | "crypto" | "fiat";
  accountHolder: {
    name: string;
    email: string;
    jumpaTag: string;
    homeAddress?: string;
  };
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  wallets?: {
    solana?: string;
    base?: string;
    ethereum?: string;
    stellar?: string;
    tron?: string;
  };
  summaries: CurrencySummary[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netMovement: number;
    transactionCount: number;
  };
  transactions: StatementTransactionRow[];
}

const TYPE_LABEL_MAP: Record<string, string> = {
  SAVINGS_DEPOSIT: "Savings",
  SAVINGS_WITHDRAW: "Savings",
  TRANSFER: "Transfer",
  SWAP: "Swap",
  ONRAMP: "Deposit",
  OFFRAMP: "Withdrawal",
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdrawal",
  AIRTIME: "Airtime",
  DATA: "Data",
  BRIDGE: "Bridge",
  FAUCET: "Faucet",
};

export function formatTransactionType(type: string): string {
  const upper = (type || "").toUpperCase();
  if (TYPE_LABEL_MAP[upper]) return TYPE_LABEL_MAP[upper];
  return upper
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateCompact(d: Date): string {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDayOnly(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrencyAmount(num: number, currency: string): string {
  const isNgn = currency.toUpperCase() === "NGN" || currency.toUpperCase() === "CNGN";
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (isNgn) {
    return `₦${formatted}`;
  }
  return `${formatted} ${currency.toUpperCase()}`.trim();
}

export async function generateUserStatement(
  userId: string,
  input: StatementRequestInput,
): Promise<{ success: boolean; data?: StatementData; error?: string; status?: number }> {
  await connectDB();

  // 1. PIN verification (if provided)
  if (input.pin) {
    const wallet = await findWalletForUser(userId);
    if (!wallet) {
      return { success: false, error: "Wallet not found", status: 404 };
    }
    const pinCheck = await verifyWalletPin(wallet, input.pin, { userId });
    if (!pinCheck.ok) {
      return {
        success: false,
        error: pinCheck.error || "Invalid PIN",
        status: pinCheck.status || 401,
      };
    }
  }

  // 2. Fetch User Profile, Wallet, and NGN Bank Account
  const [user, wallet, ngnAccount] = await Promise.all([
    User.findById(userId).lean(),
    Wallet.findOne({ userId }).lean(),
    NgnAccount.findOne({ userId, status: "active" })
      .sort({ updatedAt: -1 })
      .lean()
      .then((acc) => acc || NgnAccount.findOne({ userId }).sort({ updatedAt: -1 }).lean()),
  ]);

  if (!user) {
    return { success: false, error: "User profile not found", status: 404 };
  }

  // 3. Assemble Date Range
  const startDate = new Date(`${input.from}T00:00:00.000Z`);
  const endDate = new Date(`${input.to}T23:59:59.999Z`);

  // 4. Construct Query
  const filterClauses: any[] = [
    { userId },
    { createdAt: { $gte: startDate, $lte: endDate } },
    { status: { $in: ["CONFIRMED", "COMPLETED"] } },
  ];

  if (input.currency === "crypto") {
    filterClauses.push({
      $or: [
        { chain: { $in: ["solana", "stellar", "base", "eth", "ethereum", "tron"] } },
        { token: { $in: ["USDC", "USDT", "SOL", "ETH", "XLM", "TRX", "BASE"] } },
      ],
      chain: { $ne: "fiat" },
    });
  } else if (input.currency === "fiat") {
    filterClauses.push({
      $or: [
        { chain: "fiat" },
        { token: { $in: ["NGN", "cNGN", "AIRTIME", "DATA"] } },
        { "rampDetails.fiatCurrency": "NGN" },
        { type: { $in: ["AIRTIME", "DATA"] } },
      ],
    });
  }

  const query = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

  // Fetch up to 2500 records chronologically (oldest to newest for statement ledger)
  const rawTransactions = await Transaction.find(query)
    .sort({ createdAt: 1 })
    .limit(2500)
    .lean<ITransaction[]>();

  // Currency breakdown accumulator
  const currencyMap: Record<string, { inflow: number; outflow: number; count: number }> = {};

  const rows: StatementTransactionRow[] = rawTransactions.map((tx: any) => {
    const base = getBaseTransactionFields(tx);
    const dateObj = new Date(base.createdAt);
    const numAmount = Math.abs(parseFloat(base.rawAmount) || 0);

    const token = (base.tokenPart || base.token || (input.currency === "fiat" ? "NGN" : "USDC")).toUpperCase();
    const cleanToken = token.startsWith("C") && token.length === 4 ? token.slice(1) : token;

    if (!currencyMap[cleanToken]) {
      currencyMap[cleanToken] = { inflow: 0, outflow: 0, count: 0 };
    }
    currencyMap[cleanToken].count += 1;

    const direction: "inflow" | "outflow" | "neutral" =
      base.amount.startsWith("+")
        ? "inflow"
        : base.amount.startsWith("-")
          ? "outflow"
          : "neutral";

    let debit = "";
    let credit = "";

    if (direction === "inflow") {
      currencyMap[cleanToken].inflow += numAmount;
      credit = formatCurrencyAmount(numAmount, cleanToken);
    } else if (direction === "outflow") {
      currencyMap[cleanToken].outflow += numAmount;
      debit = formatCurrencyAmount(numAmount, cleanToken);
    }

    // Database transaction ID with 'tx' prefix stripped for a uniform, unique reference
    const rawTxId = String(tx._id || tx.id || base.id || "");
    const cleanRef = rawTxId.replace(/^tx_?/i, "").toUpperCase();
    const ref = cleanRef || "";

    return {
      id: base.id,
      displayId: base.displayId,
      date: formatDateCompact(dateObj),
      timestamp: base.createdAt,
      description: base.title,
      type: (tx.type || "TRANSFER").toUpperCase(),
      formattedType: formatTransactionType(tx.type || "TRANSFER"),
      direction,
      debit,
      credit,
      amount: base.amount,
      rawAmount: numAmount,
      token: cleanToken,
      status: "CONFIRMED",
      reference: ref,
    };
  });

  const summaries: CurrencySummary[] = Object.entries(currencyMap).map(([cur, stats]) => ({
    currency: cur,
    totalInflow: Math.round(stats.inflow * 100) / 100,
    totalOutflow: Math.round(stats.outflow * 100) / 100,
    netMovement: Math.round((stats.inflow - stats.outflow) * 100) / 100,
    count: stats.count,
  }));

  // Fallback summary if no transactions exist
  if (summaries.length === 0) {
    const defaultCur = input.currency === "fiat" ? "NGN" : "USD";
    summaries.push({
      currency: defaultCur,
      totalInflow: 0,
      totalOutflow: 0,
      netMovement: 0,
      count: 0,
    });
  }

  // Primary summary total
  const primarySummary = summaries[0];

  // Clean Jumpa Tag: strip any leading @ sign
  const cleanTag = user.jumpaTag ? user.jumpaTag.replace(/^@+/, "").trim() : "";

  let bankAccountData: StatementData["bankAccount"] = undefined;
  if (ngnAccount && (ngnAccount.accountNumber || ngnAccount.bankName)) {
    bankAccountData = {
      bankName: ngnAccount.bankName || undefined,
      accountNumber: ngnAccount.accountNumber || undefined,
      accountName: ngnAccount.accountName || user.name || undefined,
    };
  }

  let walletsData: StatementData["wallets"] = undefined;
  if (wallet) {
    walletsData = {
      solana: wallet.addresses?.sol || undefined,
      base: wallet.addresses?.base || wallet.addresses?.eth || wallet.address || undefined,
      ethereum: wallet.addresses?.eth || wallet.address || undefined,
      stellar: wallet.addresses?.xlm || undefined,
      tron: wallet.addresses?.trx || undefined,
    };
  }

  const statementRef = generateStatementId();

  const statementData: StatementData = {
    statementId: statementRef,
    generatedAt: formatDateCompact(new Date()),
    period: {
      from: formatDayOnly(startDate),
      to: formatDayOnly(endDate),
    },
    currency: input.currency,
    accountHolder: {
      name: user.name || "Jumpa User",
      email: user.email || "",
      jumpaTag: cleanTag,
      homeAddress: input.homeAddress?.trim() || undefined,
    },
    bankAccount: bankAccountData,
    wallets: walletsData,
    summaries,
    summary: {
      totalInflow: primarySummary.totalInflow,
      totalOutflow: primarySummary.totalOutflow,
      netMovement: primarySummary.netMovement,
      transactionCount: rows.length,
    },
    transactions: rows,
  };

  return { success: true, data: statementData };
}

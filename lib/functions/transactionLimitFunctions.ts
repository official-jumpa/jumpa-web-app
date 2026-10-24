import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { KYCSchema } from "@/models/KYCSchema";
import { Transaction } from "@/models/Transaction";
import { getLiveRates } from "@/lib/rates";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Central Platform Transaction Limits.
 */
export const TRANSACTION_LIMIT_CONFIG = {
  NON_KYC_DAILY_USD: 500,
  KYC_DAY_1_USD: 1000, // Day 1 probation (0 - 24 hours)
  KYC_DAY_2_USD: 2000, // Day 2 probation (24 - 48 hours)
  KYC_MAX_DAILY_USD: 5000, // Standard full limit
} as const;

/**
 * Standard client-facing error message. Kept for legacy fallback.
 */
export const LIMIT_ERROR_MESSAGE =
  "Daily transaction limit reached. Please try again tomorrow.";

/**
 * Error thrown when a proposed transaction exceeds a user's rolling 24-hour limit.
 * Provides a user-friendly suggestion with their exact remaining limit in USD.
 */
export class TransactionLimitError extends Error {
  remainingLimitUsd: number;
  dailyLimitUsd: number;

  constructor(remainingLimitUsd: number, dailyLimitUsd: number) {
    const formattedRemaining = Math.floor(remainingLimitUsd).toLocaleString();
    const message =
      remainingLimitUsd > 0
        ? `Daily limit exceeded. Please try an amount below $${formattedRemaining}.`
        : "Daily transaction limit reached. Please try again tomorrow.";
    super(message);
    this.name = "TransactionLimitError";
    this.remainingLimitUsd = remainingLimitUsd;
    this.dailyLimitUsd = dailyLimitUsd;
  }
}

/**
 * Helper to identify limit errors across routes and execution modules.
 */
export function isLimitError(err: any): boolean {
  if (!err) return false;
  if (err instanceof TransactionLimitError || err?.name === "TransactionLimitError") return true;
  const msg = typeof err === "string" ? err : err?.message;
  if (typeof msg === "string") {
    return (
      msg === LIMIT_ERROR_MESSAGE ||
      msg.includes("Daily limit exceeded") ||
      msg.includes("Daily transaction limit reached") ||
      msg.includes("try an amount below")
    );
  }
  return false;
}

/**
 * Determines a user's applicable daily transaction limit in USD based on KYC status
 * and security history.
 */
export async function getUserDailyTransactionLimit(userId: string): Promise<number> {
  await connectDB();

  const [user, kyc] = await Promise.all([
    User.findById(userId).select("passwordResetAt pinResetAt").lean(),
    KYCSchema.findOne({ userId }).select("status isCompleted completedAt").lean(),
  ]);

  const isKycApproved = kyc?.status === "approved" || kyc?.isCompleted === true;

  // 1. Non-KYC users are strictly capped
  if (!isKycApproved) {
    return TRANSACTION_LIMIT_CONFIG.NON_KYC_DAILY_USD;
  }

  // 2. Identify all relevant security probation events
  const eventTimestamps: number[] = [];

  if (kyc?.completedAt) {
    eventTimestamps.push(new Date(kyc.completedAt).getTime());
  }
  if (user?.passwordResetAt) {
    eventTimestamps.push(new Date(user.passwordResetAt).getTime());
  }
  if (user?.pinResetAt) {
    eventTimestamps.push(new Date(user.pinResetAt).getTime());
  }

  // If no timestamp recorded (e.g., existing legacy verified user with no recent reset), grant full tier
  if (eventTimestamps.length === 0) {
    return TRANSACTION_LIMIT_CONFIG.KYC_MAX_DAILY_USD;
  }

  const latestEventTime = Math.max(...eventTimestamps);
  const msElapsed = Date.now() - latestEventTime;
  const hoursElapsed = msElapsed / (1000 * 60 * 60);

  // 3. Graduated Probation Tiers
  if (hoursElapsed < 24) {
    return TRANSACTION_LIMIT_CONFIG.KYC_DAY_1_USD;
  } else if (hoursElapsed < 48) {
    return TRANSACTION_LIMIT_CONFIG.KYC_DAY_2_USD;
  } else {
    return TRANSACTION_LIMIT_CONFIG.KYC_MAX_DAILY_USD;
  }
}

/**
 * Calculates the total USD volume spent by the user across all outbound
 * transactions in the last rolling 24 hours.
 */
export async function getRollingDailySpentUsd(userId: string): Promise<number> {
  await connectDB();

  const rolling24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const aggregation = await Transaction.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: rolling24HoursAgo },
        status: { $in: ["CONFIRMED", "PENDING"] },
        // Only count outbound / value-moving operations
        type: {
          $in: [
            "TRANSFER",
            "SWAP",
            "BRIDGE",
            "OFFRAMP",
            "WITHDRAW",
            "AIRTIME",
            "DATA",
            "SAVINGS_DEPOSIT",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalUsd: {
          $sum: {
            $ifNull: [
              "$amountInUsd",
              {
                // Fallback for legacy records without amountInUsd if denominated in USD/USDC/USDT
                $cond: [
                  { $in: ["$token", ["USDC", "USDT", "USD"]] },
                  { $toDouble: "$amount" },
                  0,
                ],
              },
            ],
          },
        },
      },
    },
  ]);

  return aggregation[0]?.totalUsd || 0;
}

/**
 * Converts any crypto asset or fiat currency amount to its USD equivalent.
 */
export async function convertToUsd(
  amount: number | string,
  tokenOrCurrency: string,
): Promise<number> {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
    return 0;
  }

  const symbol = (tokenOrCurrency || "").trim().toUpperCase();

  // Stablecoins pegged 1:1
  if (symbol === "USD" || symbol === "USDC" || symbol === "USDT") {
    return numericAmount;
  }

  try {
    const liveRates = await getLiveRates();

    // Check if it's a crypto token (XLM, ETH, SOL, TRX, etc.)
    const tokenRate = liveRates.tokens?.find(
      (t) => t.symbol.toUpperCase() === symbol,
    );
    if (tokenRate?.usd && tokenRate.usd > 0) {
      return numericAmount * tokenRate.usd;
    }

    // Check if it's a fiat currency (NGN, GHS, KES, ZAR, etc.)
    const fiatRate = liveRates.fiatRates?.[symbol];
    if (fiatRate?.perUsd && fiatRate.perUsd > 0) {
      return numericAmount / fiatRate.perUsd;
    }

    // Fallback for NGN if liveRates is unavailable
    if (symbol === "NGN") {
      return numericAmount / 1550;
    }
  } catch (err) {
    console.warn(
      `[convertToUsd] Rate lookup warning for ${symbol}: ${formatOneLineError(err)}`,
    );
    if (symbol === "NGN") {
      return numericAmount / 1550;
    }
  }

  return numericAmount;
}

/**
 * Gatekeeper assertion function.
 * Validates whether the proposed transaction exceeds the user's rolling 24-hour limit.
 * Throws an Error with LIMIT_ERROR_MESSAGE if exceeded.
 */
export async function assertDailyTransactionLimit(params: {
  userId: string;
  amount: number | string;
  tokenOrCurrency: string;
}): Promise<{
  amountInUsd: number;
  remainingLimitUsd: number;
  dailyLimitUsd: number;
}> {
  const amountInUsd = await convertToUsd(params.amount, params.tokenOrCurrency);

  const [dailyLimitUsd, alreadySpentUsd] = await Promise.all([
    getUserDailyTransactionLimit(params.userId),
    getRollingDailySpentUsd(params.userId),
  ]);

  const remainingLimitUsd = Math.max(0, dailyLimitUsd - alreadySpentUsd);

  if (alreadySpentUsd + amountInUsd > dailyLimitUsd) {
    console.error(
      `[SECURITY ALERT] Daily transaction limit exceeded | User: ${params.userId} | Attempted: $${amountInUsd.toFixed(2)} USD (${params.amount} ${params.tokenOrCurrency}) | Spent (Rolling 24h): $${alreadySpentUsd.toFixed(2)} USD | Daily Limit: $${dailyLimitUsd} USD`,
    );
    throw new TransactionLimitError(remainingLimitUsd, dailyLimitUsd);
  }

  return {
    amountInUsd,
    remainingLimitUsd: Math.max(0, remainingLimitUsd - amountInUsd),
    dailyLimitUsd,
  };
}

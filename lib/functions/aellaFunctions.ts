import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  calculateNgnWithdrawalFee,
} from "@/lib/ngn-account";
import {
  atomicDebitNgnBalance,
  atomicCreditNgnBalance,
} from "./bellmonieFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { generateId, generateTransactionReference } from "@/lib/schema-ids";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { assertDailyTransactionLimit } from "@/lib/functions/transactionLimitFunctions";
import { findBellmonieBank } from "@/lib/constants/bellmonie-banks";

export {
  calculateNgnWithdrawalFee,
  atomicDebitNgnBalance,
  atomicCreditNgnBalance,
};

// ── Environment & Config ──

function getBaseUrl(): string {
  const url = environment.AELLA_BASE_URL || process.env.AELLA_BASE_URL;
  if (!url) return "https://api.aellaapp.com";
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = environment.AELLA_API_KEY || environment.AELLA_SANDBOX_KEY

  if (!key) {
    throw new Error("Banking key is missing");
  }
  return key;
}

// ── Base HTTP Helper ──

async function aellaRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}${endpoint}`;
  const method = options.method || "GET";

  console.log(`[Aella] API Request: ${method} ${url}`);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const startTime = Date.now();
  try {
    const timeoutMs = method === "POST" ? 15000 : 8000;
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(timeoutMs),
    });

    const duration = Date.now() - startTime;
    const responseText = await res.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!res.ok) {
      console.error(
        `[Aella] ❌ ${method} ${endpoint} failed (${res.status}) [${duration}ms]:`,
        formatOneLineError(data),
      );
      const error: any = new Error(
        data?.message || data?.error || data?.title || `Aella API error (${res.status})`,
      );
      error.status = res.status;
      error.data = data;
      throw error;
    }

    console.log(`[Aella] ✅ ${method} ${endpoint} succeeded (${res.status}) [${duration}ms]`);
    return data as T;
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error(`[Aella] Timeout on ${method} ${endpoint}`);
      const timeoutErr: any = new Error("Request timed out");
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

export function normalizeAellaDob(rawDob: string): string {
  if (!rawDob) return "";
  const cleaned = rawDob.trim().split("T")[0];
  const parts = cleaned.split(/[-/\s.]+/);
  if (parts.length === 3) {
    let year = "";
    let month = "";
    let day = "";
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parts[0];
      const m = parts[1].toLowerCase();
      month = MONTH_MAP[m] || parts[1].padStart(2, "0");
      day = parts[2].padStart(2, "0");
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY or DD-Mon-YYYY
      year = parts[2];
      const m = parts[1].toLowerCase();
      month = MONTH_MAP[m] || parts[1].padStart(2, "0");
      day = parts[0].padStart(2, "0");
    }
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }
  const d = new Date(rawDob);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return cleaned;
}

// ── Identity & BVN Resolution ──

export interface AellaBvnResolutionData {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: "Male" | "Female";
  dateOfBirth: string; // normalized YYYY-MM-DD
  rawDateOfBirth?: string;
  photo?: string;
  nin?: string;
}

/**
 * Resolves a Bank Verification Number (BVN) via Aella Identity API.
 * Pulls official legal identity from NIBSS (names, DOB, gender).
 */
export async function resolveAellaBvn(bvn: string): Promise<AellaBvnResolutionData> {
  const cleanBvn = String(bvn || "").trim();
  if (!cleanBvn || cleanBvn.length !== 11) {
    throw new Error("BVN must be exactly 11 digits");
  }

  const res = await aellaRequest<{
    success: boolean;
    message: string;
    data: {
      firstName: string;
      lastName: string;
      middleName?: string;
      gender: string;
      dateOfBirth: string;
      photo?: string;
      nin?: string;
    };
    status: number;
  }>(`/identity/bvn/resolve?bvn=${cleanBvn}`);

  if (!res.data || !res.data.firstName || !res.data.lastName) {
    throw new Error(res.message || "Unable to resolve BVN identity details");
  }

  const rawDob = res.data.dateOfBirth || "";
  const normalizedDob = normalizeAellaDob(rawDob);

  return {
    firstName: res.data.firstName.trim(),
    lastName: res.data.lastName.trim(),
    middleName: res.data.middleName ? res.data.middleName.trim() : "",
    gender: (res.data.gender || "Male").toLowerCase() === "female" ? "Female" : "Male",
    dateOfBirth: normalizedDob,
    rawDateOfBirth: rawDob,
    photo: res.data.photo,
    nin: res.data.nin,
  };
}

// ── Static Virtual Account Creation ──

export interface CreateAellaStaticAccountParams {
  firstName: string;
  lastName: string;
  middleName?: string;
  bvn: string;
  dob: string; // YYYY-MM-DD
  gender: "Male" | "Female";
  settlementWalletId?: string;
}

export interface AellaStaticAccountResult {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  currency: string;
  virtual: boolean;
  raw: any;
}

/**
 * Provisions a permanent static virtual account at Aella MFB (POST /wallets/virtual/static).
 * Note: middleName is required (empty string "" if omitted).
 */
export async function createAellaStaticAccount(
  params: CreateAellaStaticAccountParams,
): Promise<AellaStaticAccountResult> {
  const payload = {
    firstName: params.firstName.trim(),
    middleName: params.middleName?.trim() || "",
    lastName: params.lastName.trim(),
    bvn: params.bvn.trim(),
    dob: normalizeAellaDob(params.dob),
    gender: params.gender,
    ...(params.settlementWalletId ? { settlementWalletId: params.settlementWalletId } : {}),
  };

  const res = await aellaRequest<{
    success: boolean;
    message: string;
    data: {
      id: string;
      accountNumber: string;
      accountName: string;
      bankName: string;
      currency: string;
      virtual: boolean;
      balance: number;
    };
    status: number;
  }>("/wallets/virtual/static", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.data?.accountNumber) {
    throw new Error(res.message || "Failed to generate account number");
  }

  return {
    id: res.data.id,
    accountNumber: res.data.accountNumber,
    accountName: res.data.accountName,
    bankName: res.data.bankName || "Aella MFB",
    currency: res.data.currency || "NGN",
    virtual: res.data.virtual ?? true,
    raw: res.data,
  };
}

// ── Bank Name Enquiry & Transfers ──

/**
 * Detects whether a bank code, name, or alias refers specifically to Aella MFB.
 * Supports CBN code (090614), Paystack code (50315), Centiiv code (090614), and name aliases.
 */
export function isAellaBank(identifier?: string | null): boolean {
  if (!identifier) return false;
  const clean = String(identifier).toLowerCase().trim();
  return (
    clean === "090614" ||
    clean === "50315" ||
    clean.includes("aella") ||
    clean.includes("flourish")
  );
}

/**
 * Resolves a Nigerian bank account name via Aella Payout Name Enquiry.
 */
export async function aellaBankNameEnquiry(params: {
  bankCode: string;
  accountNumber: string;
}): Promise<{ accountName: string; bankName: string }> {
  const { bankCode, accountNumber } = params;
  const res = await aellaRequest<{
    success: boolean;
    message: string;
    data: {
      bankName: string;
      accountName: string;
    };
  }>(`/transfers/name-enquiry?bankCode=${bankCode}&accountNumber=${accountNumber}`);

  if (!res.data?.accountName) {
    throw new Error(res.message || "Account could not be resolved");
  }

  return {
    accountName: res.data.accountName,
    bankName: res.data.bankName,
  };
}

/**
 * Executes a single bank transfer payout via Aella Payout API (POST /transfers).
 */
export async function aellaBankTransfer(params: {
  bankCode: string;
  accountNumber: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference?: string;
  walletId?: string;
}): Promise<{ reference: string; status: string; raw: any }> {
  const payload = {
    bankCode: params.bankCode,
    accountNumber: params.accountNumber,
    amount: params.amount,
    currency: params.currency || "NGN",
    narration: params.narration || "Jumpa payout",
    reference: params.reference || `wd-${Date.now()}-${generateId("tx").slice(0, 8)}`,
    ...(params.walletId ? { walletId: params.walletId } : {}),
  };

  const res = await aellaRequest<{
    success: boolean;
    message: string;
    data: any;
    status: number;
  }>("/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    reference: payload.reference,
    status: res.data?.status || "PENDING",
    raw: res.data,
  };
}

// ── Withdrawal Orchestrator ──

export interface WithdrawAellaNgnFiatParams {
  userId: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  accountName: string;
  narration?: string;
}

/**
 * Executes a verified NGN bank withdrawal via Aella Payout API.
 * Log the error for review if it fails. No auto refund.
 */
export async function withdrawAellaNgnFiat(params: WithdrawAellaNgnFiatParams): Promise<{
  reference: string;
  fee: number;
  totalDebited: number;
  transactionId: string;
  status: string;
}> {
  await connectDB();

  const { userId, amount, accountNumber, bankName, bankCode, accountName, narration } = params;

  if (amount < 100) {
    throw new Error("Minimum withdrawal amount is ₦100");
  }

  const fee = calculateNgnWithdrawalFee(amount);
  const totalDebited = amount + fee;

  // 1. Daily limit validation
  const limitCheck = await assertDailyTransactionLimit({
    userId,
    amount,
    tokenOrCurrency: "NGN",
  });

  // 2. Resolve destination bank code
  let resolvedBankCode = bankCode?.trim();
  let resolvedBankName = bankName?.trim();

  if (!resolvedBankCode) {
    const matched = findBellmonieBank(bankName);
    if (matched) {
      resolvedBankCode = matched.code;
      resolvedBankName = matched.name;
    }
  }

  if (!resolvedBankCode) {
    throw new Error(`Could not find a valid bank code for "${bankName}". Please select your bank again.`);
  }

  // 3. Locate active user NGN account
  const account = await NgnAccount.findOne({
    userId,
    status: "active",
    provider: { $in: ["aella", "bellmonie"] },
  }).sort({ provider: 1 });

  if (!account || (account.balance || 0) < totalDebited) {
    throw new Error(`Insufficient funds. You need at least ₦${totalDebited.toLocaleString()}.`);
  }

  const reference = generateTransactionReference();

  // 4. Atomically debit user balance
  await atomicDebitNgnBalance({
    userId,
    amount: totalDebited,
    memo: `Withdrawal of ₦${amount} to ${accountNumber} (${resolvedBankName})`,
  });

  // 5. Create initial PENDING transaction record
  const transaction: any = await Transaction.create({
    userId,
    type: "WITHDRAW",
    status: "PENDING",
    chain: "fiat",
    network: "mainnet",
    fromAddress: account.accountNumber,
    toAddress: `${resolvedBankName} - ${accountNumber}`,
    amount: amount.toString(),
    amountInUsd: limitCheck.amountInUsd,
    feePaid: fee.toString(),
    token: "NGN",
    bankDetails: {
      bankName: resolvedBankName,
      bankCode: resolvedBankCode,
      accountNumber,
      accountName,
      reference,
    },
    memo: narration || `Jumpa payout to ${accountName}`,
    txHash: reference,
    executedAt: new Date(),
  });

  // 6. Dispatch transfer to Aella Payout API
  try {
    const aellaResult = await aellaBankTransfer({
      bankCode: resolvedBankCode,
      accountNumber,
      amount,
      currency: "NGN",
      narration: narration || `Jumpa payout to ${accountName}`,
      reference,
    });

    // Update transaction with upstream reference
    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: aellaResult.status === "SUCCESS" ? "CONFIRMED" : "PENDING",
        "metadata.aellaStatus": aellaResult.status,
      },
    });

    logUserActivity({
      userId,
      action: "WITHDRAWAL_INITIATED",
      details: {
        provider: "aella",
        amount,
        fee,
        totalDebited,
        accountNumber,
        bankName,
        reference,
      },
    }).catch(() => { });

    createNotification({
      userId,
      tab: "transactions",
      title: "Withdrawal Initiated",
      body: `Your withdrawal of ₦${amount.toLocaleString()} to ${bankName} (${accountNumber}) has been submitted.`,
      type: "WITHDRAWAL_INITIATED",
      link: "/transactions",
    }).catch(() => { });

    return {
      reference,
      fee,
      totalDebited,
      transactionId: String(transaction._id),
      status: aellaResult.status,
    };
  } catch (error: any) {
    console.error(`[Payout Error] Transfer ${reference} failed:`, formatOneLineError(error));

    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: "FAILED",
        errorMessage: error?.message || "Bank payout failure",
      },
    });

    createNotification({
      userId,
      tab: "transactions",
      title: "Withdrawal Under Review",
      body: `Your withdrawal of ₦${amount.toLocaleString()} encountered a processing delay and is under review. Ref: ${reference}`,
      type: "SECURITY_ALERT",
      link: "/transactions",
    }).catch(() => { });

    throw new Error(
      error?.data?.message || error?.message || "Withdrawal failed with the banking provider. Please contact support.",
    );
  }
}

/**
 * Verifies an Aella webhook signature (HMAC-SHA512).
 */
export function verifyAellaWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): boolean {
  if (!signature) return false;

  const key = environment.AELLA_API_KEY || environment.AELLA_SANDBOX_KEY;

  if (!key) {
    console.error("[Aella Webhook] Secret key missing for signature verification");
    return false;
  }

  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    const computed = crypto
      .createHmac("sha512", key)
      .update(bodyStr)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch (err: any) {
    console.error("[Aella Webhook] Signature verification exception:", err.message);
    return false;
  }
}

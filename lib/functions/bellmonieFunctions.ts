import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  mapCountryCodeToName,
  calculateNgnDepositFee,
  calculateNgnWithdrawalFee,
} from "@/lib/ngn-account";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity, saveOrUpdateBeneficiary } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { generateId } from "@/lib/schema-ids";
import { BellmonieBanks, findBellmonieBank } from "@/lib/constants/bellmonie-banks";

export {
  mapCountryCodeToName,
  calculateNgnDepositFee,
  calculateNgnWithdrawalFee,
};

/**
 * Counts how many subsidized deposits (where fee was waived) the user has made today.
 * Today is evaluated from 00:00:00 UTC.
 */
export async function getDailySubsidizedDepositCount(userId: string): Promise<number> {
  await connectDB();

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const count = await Transaction.countDocuments({
    userId,
    type: "DEPOSIT",
    status: "CONFIRMED",
    $or: [{ feePaid: "0" }, { feePaid: null }, { feePaid: { $exists: false } }],
    executedAt: { $gte: startOfDay },
  });

  return count;
}


// ── In-Memory Token & Balance Cache Registry

declare global {
  var _bellmonieTokenData: { token: string; expiresAt: number } | undefined;
  var _bellmonieTokenPromise: Promise<string> | undefined;
  var _bellmonieSyncTimestamps: Map<string, number> | undefined;
  var _bellmonieInFlightSyncs: Map<string, Promise<any>> | undefined;
}

const balanceSyncTimestamps = (globalThis._bellmonieSyncTimestamps ??= new Map<string, number>());
const inFlightSyncs = (globalThis._bellmonieInFlightSyncs ??= new Map<string, Promise<any>>());

export const BELLMONIE_BALANCE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getBaseUrl(): string {
  const url = environment.BELLMONIE_BASE_URL || process.env.BELLMONIE_BASE_URL;
  if (!url) {
    return process.env.NODE_ENV === "production"
      ? "https://baas-api.bellmonie.com"
      : "https://sandbox-baas-api.bellmonie.com";
  }
  return url.replace(/\/+$/, "");
}

function getConsumerKey(): string {
  const key = environment.BELLMONIE_API_KEY || process.env.BELLMONIE_API_KEY;
  if (!key) {
    throw new Error("API_KEY (consumerKey) is missing");
  }
  return key;
}

function getConsumerSecret(): string {
  const secret = environment.BELLMONIE_API_SECRET || process.env.BELLMONIE_API_SECRET;
  if (!secret) {
    throw new Error("API_SECRET (consumerSecret) is missing");
  }
  return secret;
}

function getBusinessPrefix(): string {
  return environment.BELLMONIE_BUSINESS_PREFIX || process.env.BELLMONIE_BUSINESS_PREFIX || "JUMPA";
}

/**
 * Invalidates cached NGN balance for a specific user, or all users.
 */
export function invalidateBellmonieNgnBalanceCache(userId?: string) {
  if (userId) {
    balanceSyncTimestamps.delete(userId);
  } else {
    balanceSyncTimestamps.clear();
  }
}

// ── Authentication & Token Generation 

/**
 * Retrieves a valid Bearer token for Bellmonie API, caching it until 5 minutes before expiry.
 */
export async function getBellmonieToken(force = false): Promise<string> {
  const now = Date.now();

  if (!force && globalThis._bellmonieTokenData && globalThis._bellmonieTokenData.expiresAt > now) {
    return globalThis._bellmonieTokenData.token;
  }

  // Mutex lock to avoid multiple simultaneous token generation requests
  if (globalThis._bellmonieTokenPromise) {
    return globalThis._bellmonieTokenPromise;
  }

  globalThis._bellmonieTokenPromise = (async () => {
    try {
      const consumerKey = getConsumerKey();
      const consumerSecret = getConsumerSecret();
      const baseUrl = getBaseUrl();
      const validityTime = "1440"; // 24 hours (in minutes)

      console.log(`[Bellmonie Auth] Generating new token from ${baseUrl}/v1/generate-token`);

      const res = await fetch(`${baseUrl}/v1/generate-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          consumerKey,
          consumerSecret,
          validityTime,
        },
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!res.ok || !data.success || !data.token) {
        console.error("[Bellmonie Auth] Token generation failed:", res.status, data);
        throw new Error(data.message || `Failed to generate Bellmonie token (${res.status})`);
      }

      // Expire 5 minutes before the validity window
      const validityMinutes = parseInt(data.expiry || validityTime, 10);
      const safeDurationMs = Math.max(5, validityMinutes - 5) * 60 * 1000;

      globalThis._bellmonieTokenData = {
        token: data.token,
        expiresAt: now + safeDurationMs,
      };

      console.log(`[Bellmonie Auth] ✅ Token generated successfully. Valid for ~${validityMinutes} mins`);
      return data.token;
    } finally {
      globalThis._bellmonieTokenPromise = undefined;
    }
  })();

  return globalThis._bellmonieTokenPromise;
}

/**
 * Base HTTP helper for Bellmonie API with auto token injection and retry on 401.
 */
async function bellmonieRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await getBellmonieToken(retried);
  const url = `${getBaseUrl()}${endpoint}`;
  const method = options.method || "GET";

  console.log(`[Bellmonie] API Request: ${method} ${url}`);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const duration = Date.now() - startTime;
    const responseText = await res.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (res.status === 401 && !retried) {
      console.warn("[Bellmonie] Token expired or invalid (401). Retrying with fresh token...");
      return await bellmonieRequest<T>(endpoint, options, true);
    }

    if (!res.ok || (data && data.success === false)) {
      console.error(`[Bellmonie] API Error [${res.status}] (${duration}ms):`, {
        url,
        method,
        status: res.status,
        response: data,
      });

      const message =
        data?.message ||
        data?.error ||
        `Bellmonie request failed with status ${res.status}`;
      const err: any = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    console.log(`[Bellmonie] API Success [${res.status}] (${duration}ms): ${method} ${url}`);
    return data as T;
  } catch (error: any) {
    if (error.status) throw error;
    console.error(`[Bellmonie] Network Error on ${method} ${url}:`, error.message);
    throw error;
  }
}

// Virtual Account Creation & Management 

export interface CreateBellmonieIndividualAccountPayload {
  firstname: string;
  lastname: string;
  middlename?: string;
  phoneNumber: string;
  emailAddress: string;
  address: string;
  bvn: string;
  nin?: string;
  gender: "male" | "female" | string;
  dateOfBirth: string; // YYYY/MM/DD
  metadata?: Record<string, any>;
}

export interface BellmonieClientResponse {
  success: boolean;
  message?: string;
  data: {
    id: number | string;
    accountNumber: string;
    accountName: string;
    accountType: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    mobileNumber: string;
    externalReference: string;
    emailAddress: string;
    bvn: string;
    gender: string;
    address: string;
    dateOfBirth: string;
    validityType?: string;
    createdAt?: number;
    updatedAt?: number;
    metadata?: Record<string, any>;
  };
}

/**
 * 1. Creates an individual client on Bellmonie, instantly issuing a dedicated virtual account.
 */
export async function createBellmonieIndividualAccount(
  params: CreateBellmonieIndividualAccountPayload,
): Promise<BellmonieClientResponse["data"]> {
  console.log("[Bellmonie] Creating individual account for email:", params.emailAddress);

  // Normalize dateOfBirth to YYYY/MM/DD
  let dob = params.dateOfBirth.replace(/-/g, "/").trim();

  const payload: Record<string, any> = {
    firstname: params.firstname.trim(),
    lastname: params.lastname.trim(),
    phoneNumber: params.phoneNumber.trim(),
    emailAddress: params.emailAddress.trim(),
    address: params.address.trim(),
    bvn: params.bvn.trim(),
    gender: params.gender.toLowerCase(),
    dateOfBirth: dob,
    ...(params.middlename?.trim() ? { middlename: params.middlename.trim() } : {}),
    ...(params.nin?.trim() ? { nin: params.nin.trim() } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const response = await bellmonieRequest<BellmonieClientResponse>(
    "/v1/account/clients/individual",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response?.data?.accountNumber) {
    console.error("[Bellmonie] Account creation did not return account details:", response);
    throw new Error(response?.message || "Failed to create Bellmonie virtual account");
  }

  console.log(`[Bellmonie] ✅ Created Virtual Account ${response.data.accountNumber} (${response.data.accountName})`);
  return response.data;
}

/**
 * 2. Gets or creates a Bellmonie NGN virtual account for an active Jumpa user.
 */
export async function getOrCreateUserBellmonieAccount(
  userId: string,
  userProfile?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone: string;
    bvn: string;
    nin?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
  },
): Promise<INgnAccount> {
  await connectDB();

  // 1. Check existing account in MongoDB
  let account = await NgnAccount.findOne({
    userId,
    provider: "bellmonie",
  }).lean<INgnAccount>();

  if (account && account.accountNumber) {
    return account;
  }

  if (!userProfile) {
    throw new Error("Profile details required to provision a new Bellmonie Naira account");
  }

  // 2. Call Bellmonie API to create individual virtual account
  const clientData = await createBellmonieIndividualAccount({
    firstname: userProfile.firstName,
    lastname: userProfile.lastName,
    middlename: userProfile.middleName,
    phoneNumber: userProfile.phone,
    emailAddress: userProfile.email,
    bvn: userProfile.bvn,
    nin: userProfile.nin,
    gender: userProfile.gender || "male",
    dateOfBirth: userProfile.dateOfBirth || "2000/01/01",
    address: userProfile.address || "Lagos, Nigeria",
    metadata: { userId },
  });

  // 3. Upsert into database
  const updatedAccount = await NgnAccount.findOneAndUpdate(
    { userId, provider: "bellmonie" },
    {
      $set: {
        currency: "NGN",
        provider: "bellmonie",
        status: "active",
        bankName: "Bloc MFB",
        accountNumber: clientData.accountNumber,
        accountName: clientData.accountName,
        providerCustomerId: String(clientData.id),
        providerReference: clientData.externalReference,
        providerMetadata: {
          bvn: clientData.bvn,
          gender: clientData.gender,
          validityType: clientData.validityType,
          clientCreatedAt: clientData.createdAt,
        },
      },
      $setOnInsert: {
        balance: 0,
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean<INgnAccount>();

  return updatedAccount!;
}

// Account & Name Verification

export interface BellmonieNameEnquiryResponse {
  success: boolean;
  message?: string;
  data: {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bank?: string;
    bvn?: string;
    sessionID?: string;
    transactionId?: string;
    responseCode?: string;
    kycLevel?: string;
  };
}

/**
 * Validates a destination Nigerian bank account using Bellmonie Name Enquiry.
 */
export async function bellmonieBankNameEnquiry(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ accountNumber: string; accountName: string; sessionId?: string; transactionId?: string }> {
  console.log(`[Bellmonie Name Enquiry] Verifying ${params.accountNumber} with bankCode ${params.bankCode}`);

  const response = await bellmonieRequest<BellmonieNameEnquiryResponse>(
    "/v1/transfer/name-enquiry",
    {
      method: "POST",
      body: JSON.stringify({
        accountNumber: params.accountNumber.trim(),
        bankCode: params.bankCode.trim(),
      }),
    },
  );

  if (!response?.data?.accountName) {
    throw new Error(response?.message || "Could not verify bank account name");
  }

  return {
    accountNumber: response.data.accountNumber,
    accountName: response.data.accountName,
    sessionId: response.data.sessionID,
    transactionId: response.data.transactionId,
  };
}

/**
 * Validates an internal Bellmonie account holder.
 */
export async function bellmonieInternalClientEnquiry(
  accountNumber: string,
): Promise<{ accountNumber: string; accountName: string; externalReference?: string }> {
  const response = await bellmonieRequest<any>(
    `/v1/client-enquiry/${accountNumber.trim()}`,
    { method: "GET" },
  );

  if (!response?.data?.accountName) {
    throw new Error(response?.message || "Bellmonie account not found");
  }

  return {
    accountNumber: response.data.accountNumber,
    accountName: response.data.accountName,
    externalReference: response.data.externalReference,
  };
}

// Outbound Bank Transfers

export interface BellmonieBankTransferPayload {
  beneficiaryBankCode: string;
  beneficiaryAccountNumber: string;
  amount: number;
  narration?: string;
  reference?: string;
  senderName?: string;
}

export interface BellmonieTransferResponse {
  success: boolean;
  message?: string;
  data: {
    reference: string;
    sessionId?: string;
    amount: number;
    charge?: number;
    netAmount?: number;
    status: string;
    destinationAccountNumber: string;
    destinationAccountName: string;
    destinationBankCode: string;
    destinationBankName: string;
    sourceAccountName?: string;
    sourceAccountNumber?: string;
    completedAt?: number;
  };
}

/**
 * Initiates an outbound bank transfer via Bellmonie.
 */
export async function bellmonieBankTransfer(
  payload: BellmonieBankTransferPayload,
): Promise<BellmonieTransferResponse["data"]> {
  const prefix = getBusinessPrefix();
  const reference = payload.reference || `${prefix}-${generateId("tx")}`;
  const amountFormatted = Number(payload.amount.toFixed(2));

  console.log(
    `[Bellmonie Transfer] Payout: ₦${amountFormatted} to ${payload.beneficiaryAccountNumber} (${payload.beneficiaryBankCode}) ref: ${reference}`,
  );

  const body: Record<string, any> = {
    beneficiaryBankCode: payload.beneficiaryBankCode.trim(),
    beneficiaryAccountNumber: payload.beneficiaryAccountNumber.trim(),
    amount: amountFormatted,
    narration: payload.narration || "Jumpa Withdrawal",
    reference,
    ...(payload.senderName ? { senderName: payload.senderName.trim() } : {}),
  };

  const response = await bellmonieRequest<BellmonieTransferResponse>(
    "/v1/transfer",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!response?.data) {
    throw new Error(response?.message || "Transfer failed to initialize with Bellmonie");
  }

  return response.data;
}

export interface WithdrawNgnFiatParams {
  userId: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  accountName: string;
  narration?: string;
}

/**
 * Orchestrates an NGN wallet withdrawal from a user's Bellmonie virtual account.
 */
export async function withdrawBellmonieNgnFiat(params: WithdrawNgnFiatParams): Promise<{
  success: boolean;
  reference: string;
  fee: number;
  totalDebited: number;
  isInternal: boolean;
  transactionId: string;
}> {
  await connectDB();

  // 1. Verify user's active Bellmonie NGN account
  const userAccount = await NgnAccount.findOne({
    userId: params.userId,
    provider: "bellmonie",
    status: "active",
  }).lean<INgnAccount>();

  if (!userAccount || !userAccount.accountNumber) {
    throw new Error("No active Naira virtual account found");
  }

  if (userAccount.accountNumber === params.accountNumber) {
    throw new Error("Cannot withdraw to your own account");
  }

  // 2. Check if destination is internal Jumpa / Bellmonie account
  const internalRecipient = await NgnAccount.findOne({
    accountNumber: params.accountNumber,
  }).lean<INgnAccount>();

  const isInternal = Boolean(internalRecipient);
  const fee = isInternal ? 0 : calculateNgnWithdrawalFee(params.amount);
  const totalDebited = params.amount + fee;

  // 3. Balance verification
  const currentBalance = userAccount.balance ?? 0;
  if (currentBalance < totalDebited) {
    throw new Error(
      `Insufficient funds. Transfer of ₦${params.amount.toLocaleString()}${
        fee > 0 ? ` + ₦${fee} withdrawal fee` : ""
      } requires ₦${totalDebited.toLocaleString()} (Available: ₦${currentBalance.toLocaleString()})`,
    );
  }

  // 4. Resolve destination bank details
  let resolvedBankCode = params.bankCode;
  let resolvedBankName = params.bankName;

  if (!resolvedBankCode) {
    const matchedBank = findBellmonieBank(params.bankName);
    if (matchedBank) {
      resolvedBankCode = matchedBank.code;
      resolvedBankName = matchedBank.name;
    }
  }

  if (!isInternal && !resolvedBankCode) {
    throw new Error(`Could not find a valid bank code for "${params.bankName}"`);
  }

  const prefix = getBusinessPrefix();
  const reference = `${prefix}-${generateId("tx")}`;

  // 5. ATOMIC PRE-DEBIT: Debit user's balance BEFORE dispatching downstream bank transfer
  // This unconditionally locks the funds and prevents double-spend race conditions.
  await atomicDebitNgnBalance({
    userId: params.userId,
    amount: totalDebited,
    memo: `Withdrawal to ${resolvedBankName} (${params.accountNumber})`,
  });

  let transferRes: { status: string; sessionId?: string } = { status: "success" };

  if (isInternal) {
    // INTERNAL BLOC-TO-BLOC TRANSFER (Database-Only)
    if (internalRecipient && internalRecipient.userId !== params.userId) {
      await atomicCreditNgnBalance({
        userId: internalRecipient.userId,
        amount: params.amount,
        reference,
        memo: `Transfer from ${userAccount.accountName || "Jumpa User"}`,
        senderName: userAccount.accountName || "Jumpa User",
        senderAccountNumber: userAccount.accountNumber,
        senderBank: "Bloc MFB",
      }).catch((err) => {
        console.error("[Bellmonie P2P] Internal credit error:", err);
      });
    }
  } else {
    // EXTERNAL TRANSFER (Bellmonie API Payout)
    try {
      // Execute downstream transfer on Bellmonie from Jumpa master pool
      transferRes = await bellmonieBankTransfer({
        beneficiaryBankCode: resolvedBankCode || "010",
        beneficiaryAccountNumber: params.accountNumber,
        amount: params.amount,
        narration: params.narration || `Withdrawal to ${params.accountName}`,
        reference,
        senderName: userAccount.accountName || "Jumpa User",
      });
    } catch (transferErr: any) {
      console.error("[Bellmonie Withdrawal] bank transfer failed. Rolling back pre-debit:", transferErr.message);
      // Automatic rollback / refund
      await atomicCreditNgnBalance({
        userId: params.userId,
        amount: totalDebited,
        reference: `${reference}-rollback`,
        memo: `Refund for failed transfer attempt: ${transferErr.message}`,
        eventId: `${reference}-rollback`,
      }).catch((rollbackErr) => {
        console.error("[Bellmonie Withdrawal CRITICAL] Rollback credit failed:", rollbackErr);
      });
      throw transferErr;
    }
  }

  // 7. Record confirmed Transaction
  const transaction: any = await Transaction.create({
    userId: params.userId,
    type: "WITHDRAW",
    status: transferRes.status === "failed" ? "FAILED" : "CONFIRMED",
    chain: "fiat",
    network: "mainnet",
    fromAddress: userAccount.accountNumber,
    toAddress: `${resolvedBankName} - ${params.accountNumber}`,
    amount: params.amount.toString(),
    feePaid: fee.toString(),
    token: "NGN",
    bankDetails: {
      bankName: resolvedBankName,
      bankCode: resolvedBankCode,
      accountNumber: params.accountNumber,
      accountName: params.accountName,
      reference,
    },
    memo: params.narration || (isInternal ? `Transfer to ${params.accountName}` : `Withdrawal to ${params.accountName}`),
    txHash: transferRes.sessionId || reference,
    executedAt: new Date(),
  });

  // 8. Save beneficiary for quick repeat transfers
  saveOrUpdateBeneficiary(params.userId, {
    type: "bank",
    name: params.accountName,
    identifier: params.accountNumber,
    details: {
      accountNumber: params.accountNumber,
      bankName: resolvedBankName,
      bankCode: resolvedBankCode,
      currency: "NGN",
    },
  }).catch(() => {});

  logUserActivity({
    userId: params.userId,
    action: "WITHDRAWAL_COMPLETED",
    details: {
      amount: params.amount,
      fee,
      totalDebited,
      bankName: resolvedBankName,
      accountNumber: params.accountNumber,
      reference,
    },
  }).catch(() => {});

  createNotification({
    userId: params.userId,
    tab: "transactions",
    type: "WITHDRAWAL_COMPLETED",
    title: "Transfer Sent",
    body: `₦${params.amount.toLocaleString()} has been sent to ${params.accountName} (${resolvedBankName})`,
    metadata: {
      amount: params.amount,
      reference,
      bankName: resolvedBankName,
    },
    link: "/transactions",
  }).catch(() => {});

  return {
    success: true,
    reference,
    fee,
    totalDebited,
    isInternal,
    transactionId: transaction._id.toString(),
  };
}

// Ledger Operations

/**
 * Atomically debits Naira from a user's active Bellmonie account.
 */
export async function atomicDebitNgnBalance(params: {
  userId: string;
  amount: number;
  memo?: string;
}): Promise<{ success: boolean; newBalance: number }> {
  await connectDB();

  const updatedAccount = await NgnAccount.findOneAndUpdate(
    {
      userId: params.userId,
      provider: "bellmonie",
      status: "active",
      balance: { $gte: params.amount },
    },
    {
      $inc: { balance: -params.amount },
    },
    { returnDocument: "after" },
  );

  if (!updatedAccount) {
    console.warn(`[Bellmonie Debit] Insufficient balance for user ${params.userId} attempting to debit ₦${params.amount}`);
    throw new Error("Insufficient NGN wallet balance");
  }

  invalidateBalanceCache(params.userId);
  invalidateBellmonieNgnBalanceCache(params.userId);

  console.log(`[Bellmonie Debit] ✅ Atomically debited ₦${params.amount} from user ${params.userId}. Remaining: ₦${updatedAccount.balance}`);
  return { success: true, newBalance: updatedAccount.balance };
}

/**
 * Atomically credits Naira to a user's active Bellmonie account.
 */
export async function atomicCreditNgnBalance(params: {
  userId: string;
  amount: number;
  reference?: string;
  memo?: string;
  eventId?: string;
  feePaid?: number;
  grossAmount?: number;
  senderName?: string;
  senderAccountNumber?: string;
  senderBank?: string;
}): Promise<{ success: boolean; newBalance: number }> {
  await connectDB();

  const dedupKey = params.eventId || params.reference;

  // Idempotency check: Guard against duplicate events
  if (dedupKey) {
    const existing = await Transaction.findOne({ txHash: dedupKey });
    if (existing) {
      console.log(`[Bellmonie Credit] Duplicate transaction ignored, hash: ${dedupKey}`);
      const acc = await NgnAccount.findOne({ userId: params.userId, provider: "bellmonie" }).lean<INgnAccount>();
      return { success: true, newBalance: acc?.balance || 0 };
    }
  }

  // Atomic Balance Increment
  let updatedAccount = await NgnAccount.findOneAndUpdate(
    { userId: params.userId, provider: "bellmonie" },
    {
      $inc: { balance: params.amount },
      $set: { status: "active" },
    },
    { returnDocument: "after" },
  );

  if (!updatedAccount) {
    updatedAccount = await NgnAccount.findOneAndUpdate(
      { userId: params.userId },
      {
        $inc: { balance: params.amount },
        $set: { status: "active", provider: "bellmonie" },
      },
      { returnDocument: "after", upsert: true },
    );
  }

  const newBalance = updatedAccount?.balance ?? params.amount;

  // Create confirmed Transaction record
  if (params.reference) {
    await Transaction.create({
      userId: params.userId,
      type: "DEPOSIT",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      toAddress: updatedAccount.accountNumber || "Bloc MFB",
      fromAddress: params.senderName || params.senderAccountNumber || "NGN_BANK_TRANSFER",
      amount: params.amount.toString(),
      feePaid: params.feePaid !== undefined ? params.feePaid.toString() : "0",
      token: "NGN",
      bankDetails: {
        bankName: "Bloc MFB",
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        reference: params.reference,
        senderName: params.senderName,
        senderAccountNumber: params.senderAccountNumber,
        senderBank: params.senderBank,
      },
      memo: params.memo || `Naira Deposit (₦${params.amount.toLocaleString()})`,
      txHash: dedupKey,
      executedAt: new Date(),
    });
  }

  invalidateBalanceCache(params.userId);
  invalidateBellmonieNgnBalanceCache(params.userId);

  logUserActivity({
    userId: params.userId,
    action: "DEPOSIT_COMPLETED",
    details: {
      amount: params.amount,
      feePaid: params.feePaid ?? 0,
      grossAmount: params.grossAmount ?? params.amount,
      token: "NGN",
      reference: params.reference,
      newBalance,
    },
  }).catch(() => {});

  const isRefund = Boolean(params.memo?.toLowerCase().includes("refund"));
  createNotification({
    userId: params.userId,
    tab: "transactions",
    type: isRefund ? "SECURITY_ALERT" : "DEPOSIT_COMPLETED",
    title: isRefund ? "Refund Credited" : "Naira Deposit Received",
    body: isRefund
      ? `₦${params.amount.toLocaleString()} has been refunded to your Naira balance.`
      : params.memo || `₦${params.amount.toLocaleString()} has been credited to your Naira wallet`,
    metadata: {
      amount: params.amount,
      token: "NGN",
      reference: params.reference,
    },
    link: "/transactions",
  }).catch(() => {});

  console.log(`[Bellmonie Credit] ✅ Atomically credited ₦${params.amount} to user ${params.userId}. New Balance: ₦${newBalance}`);
  return { success: true, newBalance };
} 

/**
 * Queries a transaction status by its reference on Bellmonie.
 */
export async function queryBellmonieTransactionByReference(
  reference: string,
): Promise<any> {
  return bellmonieRequest<any>(
    `/v1/transactions/reference/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}

/**
 * Performs a Transfer Status Query (TSQ) using transactionId.
 */
export async function requeryBellmonieTransferTsq(
  transactionId: string,
): Promise<any> {
  return bellmonieRequest<any>(
    `/v1/transfer/tsq?transactionId=${encodeURIComponent(transactionId)}`,
    { method: "GET" },
  );
}

/**
 * Retrieves master platform business account details.
 */
export async function getBellmonieMasterAccount(): Promise<any> {
  return bellmonieRequest<any>("/v1/account", { method: "GET" });
}

/**
 * Retrieves a list of client virtual accounts provisioned under this business.
 */
export async function getBellmonieClientAccounts(
  page?: number,
  limit?: number,
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (typeof page === "number") queryParams.append("page", String(page));
  if (typeof limit === "number") queryParams.append("limit", String(limit));

  const qs = queryParams.toString();
  const endpoint = qs ? `/v1/account/clients?${qs}` : "/v1/account/clients";
  return bellmonieRequest<any>(endpoint, { method: "GET" });
}

/**
 * Retrieves a list of transactions from Bellmonie.
 */
export async function getBellmonieTransactions(
  page = 1,
  limit = 30,
): Promise<any> {
  return bellmonieRequest<any>(
    `/v1/transactions?page=${page}&limit=${limit}`,
    { method: "GET" },
  );
}

/**
 * Verifies Jumpa official Bloc MFB master account, checks user's active Bellmonie/Bloc MFB account & balance,
 * and atomically debits user's ledger before vending bill services (airtime/data).
 */
export async function transferToOfficialJumpaBlocAccount(params: {
  userId: string;
  amount: number;
  narration: string;
  reference?: string;
}): Promise<{ success: boolean; reference: string; fromAccount: string }> {
  await connectDB();

  // 1. Verify Jumpa's official master Bloc MFB account (hard error if unconfigured)
  const jumpaAccountNumber = environment.JUMPA_ACCOUNT_NUMBER?.trim();
  const jumpaBankName = environment.JUMPA_BANK_NAME?.trim();
  const jumpaAccountName = environment.JUMPA_ACCOUNT_NAME?.trim();

  if (!jumpaAccountNumber || !jumpaBankName || !jumpaAccountName) {
    console.error("[Bellmonie] Missing Jumpa official account details");
    throw new Error("Incomplete configuration");
  }

  // 2. Verify user has an active Bellmonie / Bloc MFB account
  const userAccount = await NgnAccount.findOne({
    userId: params.userId,
    provider: "bellmonie",
    status: "active",
  }).lean<INgnAccount>();

  if (!userAccount || !userAccount.accountNumber) {
    throw new Error("Please create a Naira account first");
  }

  // 3. Verify user balance
  const currentBalance = Number(userAccount.balance ?? 0);
  if (currentBalance < params.amount) {
    throw new Error("Insufficient NGN wallet balance");
  }

  const reference = params.reference || generateId("bill");

  // 4. Atomically debit user balance in Bellmonie ledger
  await atomicDebitNgnBalance({
    userId: params.userId,
    amount: params.amount,
    memo: params.narration,
  });

  return {
    success: true,
    reference,
    fromAccount: userAccount.accountNumber,
  };
}

/**
 * Refunds funds back to the user's Bellmonie/Bloc MFB virtual account
 * if a downstream provider fails to deliver a bill purchase.
 */
export async function refundFromOfficialJumpaBlocAccount(params: {
  userId: string;
  amount: number;
  narration: string;
  reference?: string;
}): Promise<boolean> {
  await connectDB();
  try {
    await atomicCreditNgnBalance({
      userId: params.userId,
      amount: params.amount,
      memo: params.narration,
      reference: params.reference || generateId("bill"),
    });
    return true;
  } catch (err: any) {
    console.error("[Bellmonie] Failed to refund user Bloc MFB balance:", err);
    return false;
  }
}


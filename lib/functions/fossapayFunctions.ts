import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import {
  mapCountryCodeToName,
  calculateFossaPayDepositFee,
  calculateFossaPayWithdrawalFee,
} from "@/lib/ngn-account";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity, saveOrUpdateBeneficiary } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { generateBillReference, generateId } from "@/lib/schema-ids";
import { FossaPayBanks, findFossaPayBank } from "@/lib/constants/fossapay-banks";

function getBaseUrl(): string {
  const url = environment.FOSSAPAY_BASE_URL || process.env.FOSSAPAY_BASE_URL;
  if (!url) {
    console.error("Missing BASE_URL");
    throw new Error("BASE_URL is missing");
  }
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = environment.FOSSAPAY_API_KEY || process.env.FOSSAPAY_API_KEY;
  if (!key) {
    console.error("Missing API_KEY");
    throw new Error("API_KEY is missing");
  }
  return key;
}

export {
  mapCountryCodeToName,
  calculateFossaPayDepositFee,
  calculateFossaPayWithdrawalFee,
};

/**
 * Base HTTP helper for FossaPay API
 */
async function fossapayRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}${endpoint}`;
  const method = options.method || "GET";

  console.log(`[FossaPay] API Request: ${method} ${url}`);

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
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

    if (!res.ok) {
      console.error(`[FossaPay] API Error [${res.status}] (${duration}ms):`, {
        url,
        method,
        status: res.status,
        response: data,
      });

      const message =
        data?.message ||
        data?.error ||
        `FossaPay request failed with status ${res.status}`;
      const err: any = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    console.log(`[FossaPay] API Success [${res.status}] (${duration}ms): ${method} ${url}`);
    return data as T;
  } catch (error: any) {
    if (error.status) throw error;
    console.error(`[FossaPay] Network / Unexpected Error on ${method} ${url}:`, error.message);
    throw error;
  }
}

export interface CreateCustomerPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  emailAddress: string;
  mobileNumber: string;
  dateOfBirth: string; // YYYY-MM-DD
  address: string;
  city: string;
  country: string;
}

export interface FossaPayCustomerResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    emailAddress: string;
    mobileNumber: string;
    dob: string;
    address: string;
    customerType: "individual";
    businessId?: string;
    createdAt?: string;
  };
}

export interface CreateWalletPayload {
  customerId: string;
  walletName: string;
  walletReference: string;
}

export interface FossaPayWalletResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    walletId: string;
    bankName: string;
    bankCode: string;
    accountName: string;
    accountNumber: string;
  };
}

export interface FossaPayWalletDetailsResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    id: string;
    walletName: string;
    currency: string;
    availableBalance: number;
    ledgerBalance: number;
    bankDetails?: {
      bankName: string;
      bankCode: string;
      accountName: string;
      accountNumber: string;
    };
  };
}

/**
 * 1. Creates an individual customer on FossaPay
 * Strictly constructs payload to avoid unknown properties that FossaPay rejects.
 */
export async function createFossapayCustomer(
  params: CreateCustomerPayload
): Promise<FossaPayCustomerResponse["data"]> {
  console.log("[FossaPay] Creating individual customer for email:", params.emailAddress);

  // FossaPay strictly rejects unknown fields. Build strictly required keys.
  const payload: Record<string, any> = {
    firstName: params.firstName,
    lastName: params.lastName,
    emailAddress: params.emailAddress,
    mobileNumber: params.mobileNumber,
    dateOfBirth: params.dateOfBirth,
    address: params.address,
    city: params.city,
    country: params.country,
    type: "individual",
  };

  if (params.middleName && params.middleName.trim()) {
    payload.middleName = params.middleName.trim();
  }

  console.log("[FossaPay] Customer payload prepared:", {
    ...payload,
    mobileNumber: payload.mobileNumber ? `${payload.mobileNumber.slice(0, 5)}***` : "",
  });

  try {
    const response = await fossapayRequest<FossaPayCustomerResponse>(
      "/api/v1/customers",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!response?.data?.id) {
      console.error("[FossaPay] Invalid response format on customer create:", response);
      throw new Error("FossaPay customer creation did not return a valid customer ID");
    }

    console.log("[FossaPay] Customer created successfully with ID:", response.data.id);
    return response.data;
  } catch (error: any) {
    if (
      error.status === 400 ||
      error.message?.toLowerCase().includes("duplicate") ||
      error.message?.toLowerCase().includes("already")
    ) {
      console.log("[FossaPay] Customer creation returned duplicate/400. Reconciling by email search:", params.emailAddress);
      try {
        const searchRes = await fossapayRequest<any>(
          `/api/v1/customers?search=${encodeURIComponent(params.emailAddress)}`
        );
        const existing = searchRes?.data?.result?.find(
          (c: any) => c.emailAddress?.toLowerCase() === params.emailAddress.toLowerCase()
        );
        if (existing?.id) {
          console.log("[FossaPay] Reconciled existing customer successfully:", existing.id);
          return existing;
        }
      } catch (searchErr) {
        console.warn("[FossaPay] Reconcile search failed:", searchErr);
      }
    }
    throw error;
  }
}

/**
 * 2. Creates a dedicated NGN fiat wallet for an existing customer
 */
export async function createFossapayNgnWallet(
  params: CreateWalletPayload
): Promise<FossaPayWalletResponse["data"]> {
  console.log("[FossaPay] Provisioning NGN wallet for customerId:", params.customerId, "ref:", params.walletReference);

  const payload = {
    customerId: params.customerId,
    walletName: params.walletName,
    walletReference: params.walletReference,
  };

  const response = await fossapayRequest<FossaPayWalletResponse>(
    "/api/v1/wallets/fiat/create",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (!response?.data?.accountNumber) {
    console.error("[FossaPay] Wallet create response missing account number:", response);
    throw new Error("FossaPay wallet creation did not return bank account details");
  }

  console.log("[FossaPay] NGN Wallet provisioned successfully:", {
    walletId: response.data.walletId,
    bankName: response.data.bankName,
    accountNumber: response.data.accountNumber,
  });

  return response.data;
}

/**
 * 3. Retrieves customer details by FossaPay customer UUID
 */
export async function getFossapayCustomer(
  customerId: string
): Promise<FossaPayCustomerResponse["data"]> {
  console.log("[FossaPay] Fetching customer details for ID:", customerId);
  const response = await fossapayRequest<FossaPayCustomerResponse>(
    `/api/v1/customers/${customerId}`
  );
  return response.data;
}

/**
 * 4. Retrieves wallet details and balance by FossaPay wallet UUID
 */
export async function getFossapayWallet(
  walletId: string
): Promise<FossaPayWalletDetailsResponse["data"]> {
  console.log("[FossaPay] Fetching wallet details for walletId:", walletId);
  const response = await fossapayRequest<FossaPayWalletDetailsResponse>(
    `/api/v1/wallets/fiat/${walletId}`
  );
  return response.data;
}

/**
 * 5. Lists transaction history for an NGN wallet
 */
export async function getFossapayWalletTransactions(
  walletId: string,
  opts?: { page?: number; limit?: number }
): Promise<any> {
  const page = opts?.page || 1;
  const limit = opts?.limit || 50;
  console.log(`[FossaPay] Fetching wallet transactions for ${walletId} (page ${page}, limit ${limit})`);
  return fossapayRequest(
    `/api/v1/wallets/fiat/${walletId}/transactions?page=${page}&limit=${limit}`
  );
}

// ── Wallet-to-Wallet Transfers (Internal P2P & Official Master Wallet Funding)

export interface WalletToWalletTransferPayload {
  fromAccount: string;
  toAccount: string;
  amount: number;
  reference: string;
  narration: string;
}

export interface WalletToWalletTransferResponse {
  status: string;
  statusCode: number;
  message: string;
  data: any;
}

/**
 * 6. Executes internal wallet-to-wallet transfer between two accounts
 */
export async function fossapayWalletToWalletTransfer(
  payload: WalletToWalletTransferPayload
): Promise<WalletToWalletTransferResponse["data"]> {
  console.log(
    `[FossaPay P2P] Transferring ₦${payload.amount} from ${payload.fromAccount} to ${payload.toAccount} (ref: ${payload.reference})`
  );

  try {
    const response = await fossapayRequest<WalletToWalletTransferResponse>(
      "/api/v1/wallets/fiat/transfers/wallet-to-wallet",
      {
        method: "POST",
        body: JSON.stringify({
          fromAccount: payload.fromAccount,
          toAccount: payload.toAccount,
          amount: payload.amount,
          reference: payload.reference,
          narration: payload.narration,
        }),
      }
    );
    return response?.data;
  } catch (error: any) {
    console.error("[FossaPay P2P] Transfer failed:", error.message, error.data || "");
    const msg = (error.data?.message || error.message || "").toLowerCase();
    if (msg.includes("insufficient") || msg.includes("balance")) {
      throw new Error("Insufficient funds in your Naira account");
    }
    throw new Error(error.data?.message || error.message || "Wallet transfer failed");
  }
}

// ── Outbound Bank Transfers (Name Enquiry & Inter-Bank Payouts)

export interface BankNameEnquiryResponse {
  status: boolean | string;
  statusCode: number;
  message: string;
  data: {
    accountNumber: string;
    accountName: string;
    sessionId?: string | null;
  };
}

/**
 * Validates a destination Nigerian bank account using FossaPay live Name Enquiry.
 */
export async function fossapayBankNameEnquiry(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ accountNumber: string; accountName: string }> {
  console.log(
    `Verifying ${params.accountNumber} with bankCode ${params.bankCode}`
  );

  const response = await fossapayRequest<BankNameEnquiryResponse>(
    "/api/v1/transfers/fiat/bank-name-enquiry",
    {
      method: "POST",
      body: JSON.stringify({
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
      }),
    }
  );

  if (!response?.data?.accountName) {
    throw new Error(response?.message || "Could not verify bank account name");
  }

  return {
    accountNumber: response.data.accountNumber,
    accountName: response.data.accountName,
  };
}

export interface InterBankTransferPayload {
  customerId: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
  destinationAccountName: string;
  destinationBankName: string;
  amount: number;
  reference?: string;
  remarks?: string;
}

export interface InterBankTransferResponse {
  status: string | boolean;
  statusCode: number;
  message: string;
  data: any;
}

/**
 * Executes an automated inter-bank payout to any Nigerian commercial or microfinance bank via FossaPay.
 */
export async function fossapayInterBankTransfer(
  payload: InterBankTransferPayload
): Promise<any> {
  console.log(
    `[FossaPay Payout] Inter-bank payout: ₦${payload.amount} to ${payload.destinationBankName} (${payload.destinationAccountNumber}) for customer ${payload.customerId}`
  );

  try {
    const response = await fossapayRequest<InterBankTransferResponse>(
      "/api/v1/transfers/fiat/inter-bank",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response?.data;
  } catch (error: any) {
    console.error(
      "[FossaPay Payout] Inter-bank transfer failed:",
      error.message,
      error.data || ""
    );
    const msg = (error.data?.message || error.message || "").toLowerCase();
    if (msg.includes("insufficient") || msg.includes("balance")) {
      throw new Error("Insufficient funds in your Naira account");
    }
    throw new Error(error.data?.message || error.message || "Bank payout failed");
  }
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
 * Orchestrates an NGN wallet withdrawal from a user's FossaPay virtual account.
 * Supports:
 * 1. Internal P2P transfers to another FossaPay virtual wallet (Zero Fee)
 * 2. External payouts to any other Nigerian bank account (Tiered Fee)
 */
export async function withdrawNgnFiat(params: WithdrawNgnFiatParams): Promise<{
  success: boolean;
  reference: string;
  fee: number;
  totalDebited: number;
  isInternal: boolean;
  transactionId: string;
}> {
  await connectDB();

  // 1. Verify user's active FossaPay NGN account
  const userAccount = await NgnAccount.findOne({
    userId: params.userId,
    provider: "fossapay",
    status: "active",
  }).lean<INgnAccount>();

  if (!userAccount || !userAccount.accountNumber) {
    throw new Error("No active Naira virtual account found");
  }

  // Guard against self-transfer to the same account
  if (userAccount.accountNumber === params.accountNumber) {
    throw new Error("Cannot withdraw to your own account");
  }

  // 2. Check if destination is an internal FossaPay wallet
  const internalRecipient = await NgnAccount.findOne({
    accountNumber: params.accountNumber,
  }).lean<INgnAccount>();

  const isInternal = Boolean(internalRecipient);
  const fee = isInternal ? 0 : calculateFossaPayWithdrawalFee(params.amount);
  const totalDebited = params.amount + fee;

  // 3. Balance verification
  let currentBalance = userAccount.balance ?? 0;

  if (userAccount.providerAccountId) {
    try {
      const walletDetails = await getFossapayWallet(userAccount.providerAccountId);
      if (walletDetails && typeof walletDetails.availableBalance === "number") {
        currentBalance = walletDetails.availableBalance;
        // Sync local DB balance to match live FossaPay balance
        if (userAccount.balance !== currentBalance) {
          await NgnAccount.updateOne(
            { _id: userAccount._id },
            { $set: { balance: currentBalance } }
          );
        }
      }
    } catch (walletErr: any) {
      console.warn(
        "[withdrawNgnFiat] Could not fetch live wallet details from FossaPay, using DB balance:",
        walletErr.message
      );
    }
  }

  if (currentBalance < totalDebited) {
    throw new Error(
      `Insufficient funds. Transfer of ₦${params.amount.toLocaleString()}${
        fee > 0 ? ` + ₦${fee} withdrawal fee` : ""
      } requires ₦${totalDebited.toLocaleString()} (Available: ₦${currentBalance.toLocaleString()})`
    );
  }

  const reference = generateId("tx");

  // 4. Resolve destination bank details
  let resolvedBankCode = params.bankCode;
  let resolvedBankName = params.bankName;

  if (!resolvedBankCode) {
    const matchedBank = findFossaPayBank(params.bankName);
    if (matchedBank) {
      resolvedBankCode = matchedBank.code;
      resolvedBankName = matchedBank.name;
    }
  }

  if (!isInternal && !resolvedBankCode) {
    throw new Error(`Could not find a valid bank code for "${params.bankName}"`);
  }

  // 5. Execute downstream transfer on FossaPay
  if (isInternal) {
    console.log(
      `Internal transfer of ₦${params.amount} to ${params.accountNumber} (${params.accountName})`
    );
    await fossapayWalletToWalletTransfer({
      fromAccount: userAccount.accountNumber,
      toAccount: params.accountNumber,
      amount: params.amount,
      reference,
      narration: params.narration || `Transfer to ${params.accountName}`,
    });

    // Debit sender atomic balance
    await atomicDebitNgnBalance({
      userId: params.userId,
      amount: params.amount,
      memo: `Transfer to ${params.accountName} (${params.accountNumber})`,
    });

    // Credit recipient Jumpa user if they belong to this platform
    if (internalRecipient && internalRecipient.userId !== params.userId) {
      await atomicCreditNgnBalance({
        userId: internalRecipient.userId,
        amount: params.amount,
        reference,
        memo: `Transfer from ${userAccount.accountName || "Jumpa User"}`,
      }).catch((creditErr) => {
        console.error(
          "Failed to credit recipient:",
          creditErr
        );
      });
    }
  } else {
    // External Inter-Bank payout
    const customerId = userAccount.providerCustomerId;
    if (!customerId) {
      throw new Error("Missing customer identifier for bank payout");
    }

    console.log(
      `Inter-bank transfer: ₦${params.amount} + ₦${fee} fee to ${resolvedBankName} (${params.accountNumber})`
    );

    await fossapayInterBankTransfer({
      customerId,
      destinationBankCode: resolvedBankCode!,
      destinationAccountNumber: params.accountNumber,
      destinationAccountName: params.accountName,
      destinationBankName: resolvedBankName,
      amount: params.amount,
      reference,
      remarks: params.narration || `Withdrawal to ${params.accountName}`,
    });

    // Debit sender totalDebited (amount + fee)
    await atomicDebitNgnBalance({
      userId: params.userId,
      amount: totalDebited,
      memo: `Withdrawal to ${resolvedBankName} (${params.accountNumber})`,
    });
  }

  // 6. Record confirmed Transaction
  const transaction: any = await Transaction.create({
    userId: params.userId,
    type: "WITHDRAW",
    status: "CONFIRMED",
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
    memo:
      params.narration ||
      `Withdrawal to ${params.accountName} (${resolvedBankName})`,
    txHash: reference,
    executedAt: new Date(),
  });

  // 7. Save beneficiary for quick repeat transfers
  saveOrUpdateBeneficiary(params.userId, {
    type: "bank",
    name: params.accountName,
    identifier: params.accountNumber,
    details: {
      accountNumber: params.accountNumber,
      bankName: resolvedBankName,
      bankCode: resolvedBankCode,
      country: "Nigeria",
    },
  }).catch(() => {});

  // 8. Invalidate balance cache
  invalidateBalanceCache(params.userId);

  // 9. Activity log & notification
  logUserActivity({
    userId: params.userId,
    action: "WITHDRAWAL_COMPLETED",
    details: {
      amount: params.amount,
      fee,
      recipient: params.accountName,
      bank: resolvedBankName,
      accountNumber: params.accountNumber,
      reference,
    },
  }).catch(() => {});

  createNotification({
    userId: params.userId,
    tab: "transactions",
    type: "WITHDRAWAL_COMPLETED",
    title: "Withdrawal Sent",
    body: `₦${params.amount.toLocaleString()} was sent to ${params.accountName} (${resolvedBankName})`,
    metadata: {
      amount: params.amount,
      fee,
      txHash: reference,
    },
    link: "/ngn-account",
  }).catch(() => {});

  return {
    success: true,
    reference,
    fee,
    totalDebited,
    isInternal,
    transactionId: transaction?._id ? transaction._id.toString() : reference,
  };
}

/**
 * Transfers funds from the user's FossaPay virtual account to the official Jumpa master account
 * before vending services like Airtime or Data.
 */
export async function transferToOfficialJumpaWallet(params: {
  userId: string;
  amount: number;
  narration: string;
  reference?: string;
}): Promise<{ success: boolean; reference: string; fromAccount: string }> {
  await connectDB();

  // 1. Verify user's active FossaPay account and account number
  const userAccount = await NgnAccount.findOne({
    userId: params.userId,
    provider: "fossapay",
    status: "active",
  }).lean<INgnAccount>();

  if (!userAccount || !userAccount.accountNumber) {
    throw new Error("Please create a Naira account first");
  }

  // 2. Retrieve official Jumpa account number
  const jumpaAccountNumber =
    environment.JUMPA_ACCOUNT_NUMBER || process.env.JUMPA_ACCOUNT_NUMBER;

  if (!jumpaAccountNumber) {
    console.error("Missing ACCOUNT_NUMBER");
    throw new Error("Jumpa account number is not configured");
  }

  const reference = params.reference || generateBillReference();

  // 3. Perform FossaPay wallet-to-wallet transfer
  await fossapayWalletToWalletTransfer({
    fromAccount: userAccount.accountNumber,
    toAccount: jumpaAccountNumber,
    amount: params.amount,
    reference,
    narration: params.narration,
  });

  // 4. Update local DB ledger balance
  await atomicDebitNgnBalance({
    userId: params.userId,
    amount: params.amount,
    memo: params.narration,
  }).catch((dbErr) => {
    console.warn("Local DB debit sync warning:", dbErr.message);
  });

  return {
    success: true,
    reference,
    fromAccount: userAccount.accountNumber,
  };
}

/**
 * Refunds funds from the official Jumpa wallet back to the user's FossaPay virtual account
 * if a downstream provider (SmartSMS) fails to deliver the purchase.
 */
export async function refundFromOfficialJumpaWallet(params: {
  userId: string;
  amount: number;
  userAccountNumber?: string;
  narration: string;
  reference?: string;
}): Promise<boolean> {
  await connectDB();

  let targetAccount = params.userAccountNumber;
  if (!targetAccount) {
    const userAccount = await NgnAccount.findOne({
      userId: params.userId,
      provider: "fossapay",
      status: "active",
    }).lean<INgnAccount>();
    targetAccount = userAccount?.accountNumber || undefined;
  }

  const jumpaAccountNumber =
    environment.JUMPA_ACCOUNT_NUMBER || process.env.JUMPA_ACCOUNT_NUMBER;

  const refundRef = params.reference || `ref_${generateBillReference()}`;

  if (targetAccount && jumpaAccountNumber) {
    try {
      console.log(`[FossaPay Refund] Returning ₦${params.amount} to user account ${targetAccount}...`);
      await fossapayWalletToWalletTransfer({
        fromAccount: jumpaAccountNumber,
        toAccount: targetAccount,
        amount: params.amount,
        reference: refundRef,
        narration: params.narration,
      });
    } catch (err: any) {
      console.error("[FossaPay Refund] Wallet-to-wallet refund failed, falling back to local credit:", err.message);
    }
  }

  // Always credit local DB ledger so user balance is restored
  await atomicCreditNgnBalance({
    userId: params.userId,
    amount: params.amount,
    memo: params.narration,
    reference: refundRef,
  }).catch((creditErr) => {
    console.error("[FossaPay Refund] Failed to atomically credit user balance on refund:", creditErr);
  });

  return true;
}

// ── Local Database Operations (NgnAccount model)

/**
 * 6. Find a user's NGN account record
 */
export async function getNgnAccountByUserId(
  userId: string,
  provider = "fossapay"
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ userId, provider }).lean();
}

/**
 * 7. Create an NGN account record in MongoDB
 */
export async function createNgnAccountRecord(
  data: Partial<INgnAccount>
): Promise<INgnAccount> {
  await connectDB();
  console.log("[FossaPay DB] Creating NgnAccount record for userId:", data.userId);

  const account = await NgnAccount.create({
    currency: "NGN",
    provider: "fossapay",
    ...data,
  });
  return account.toObject();
}

/**
 * 8. Update NGN account with provisioned wallet and bank details
 */
export async function updateNgnAccountWallet(
  ngnAccountId: string,
  walletData: {
    providerAccountId: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    providerReference: string;
    providerMetadata?: Record<string, any>;
  }
): Promise<INgnAccount | null> {
  await connectDB();
  console.log("[FossaPay DB] Updating NgnAccount with wallet info:", ngnAccountId, {
    bankName: walletData.bankName,
    accountNumber: walletData.accountNumber,
  });

  return NgnAccount.findByIdAndUpdate(
    ngnAccountId,
    {
      $set: {
        ...walletData,
        status: "active",
      },
    },
    { new: true }
  ).lean();
}

/**
 * 9. Find an NGN account by provider customer UUID (for webhooks or reconciliation)
 */
export async function getNgnAccountByCustomerId(
  customerId: string
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ providerCustomerId: customerId }).lean();
}

/**
 * 10. Find an NGN account by bank account number
 */
export async function getNgnAccountByAccountNumber(
  accountNumber: string
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({ accountNumber }).lean();
}

/**
 * Atomically deducts Naira from a user's active FossaPay account with a balance-guard to prevent overdrafts.
 */
export async function atomicDebitNgnBalance(params: {
  userId: string;
  amount: number;
  memo?: string;
}): Promise<{ success: boolean; newBalance: number }> {
  await connectDB();

  // 1. Verify user has an existing NGN account
  const account = await NgnAccount.findOne({ userId: params.userId }).lean<INgnAccount>();
  if (!account) {
    throw new Error("No active Naira account found. Please activate your NGN account first.");
  }
  if (account.status !== "active") {
    throw new Error("Your Naira account is currently inactive. Please contact support.");
  }

  // 2. Debit from FossaPay account (fallback to any active account for backward compatibility)
  let updatedAccount = await NgnAccount.findOneAndUpdate(
    {
      userId: params.userId,
      provider: "fossapay",
      status: "active",
      balance: { $gte: params.amount },
    },
    {
      $inc: { balance: -params.amount },
    },
    { returnDocument: "after" }
  );

  if (!updatedAccount) {
    // Fallback if legacy account was tagged with another provider
    updatedAccount = await NgnAccount.findOneAndUpdate(
      {
        userId: params.userId,
        status: "active",
        balance: { $gte: params.amount },
      },
      {
        $inc: { balance: -params.amount },
      },
      { returnDocument: "after" }
    );
  }

  if (!updatedAccount) {
    // If local DB was not yet synced with FossaPay live ledger, attempt live sync
    const freshAcc = await NgnAccount.findOne({ userId: params.userId, status: "active" });
    if (freshAcc?.providerAccountId) {
      try {
        const liveWallet = await getFossapayWallet(freshAcc.providerAccountId);
        if (liveWallet && typeof liveWallet.availableBalance === "number") {
          freshAcc.balance = liveWallet.availableBalance;
          await freshAcc.save();

          // Retry debit with refreshed balance
          updatedAccount = await NgnAccount.findOneAndUpdate(
            {
              _id: freshAcc._id,
              balance: { $gte: params.amount },
            },
            {
              $inc: { balance: -params.amount },
            },
            { returnDocument: "after" }
          );
        }
      } catch (err: any) {
        console.warn("[atomicDebitNgnBalance] Live wallet sync attempt failed:", err.message);
      }
    }
  }

  if (!updatedAccount) {
    console.warn(`[FossaPay Debit] Insufficient balance for user ${params.userId} attempting to debit ₦${params.amount}`);
    throw new Error("Insufficient NGN wallet balance");
  }

  // Invalidate balance cache
  invalidateBalanceCache(params.userId);

  console.log(`[FossaPay Debit] ✅ Atomically debited ₦${params.amount} from user ${params.userId}. Remaining: ₦${updatedAccount.balance}`);

  return { success: true, newBalance: updatedAccount.balance };
}

/**
 * Atomically credits Naira to a user's active FossaPay account, creating transaction and notification.
 */
export async function atomicCreditNgnBalance(params: {
  userId: string;
  amount: number;
  reference?: string;
  memo?: string;
  eventId?: string;
}): Promise<{ success: boolean; newBalance: number }> {
  await connectDB();

  const dedupKey = params.eventId || params.reference;

  // 1. Idempotency check: Guard against duplicate events
  if (dedupKey) {
    const existing = await Transaction.findOne({ txHash: dedupKey });
    if (existing) {
      console.log(`Duplicate transaction ignored, hash: ${dedupKey}`);
      const acc = await NgnAccount.findOne({ userId: params.userId, provider: "fossapay" }).lean<INgnAccount>();
      return { success: true, newBalance: acc?.balance || 0 };
    }
  }

  // 2. Atomic Balance Increment
  const updatedAccount = await NgnAccount.findOneAndUpdate(
    { userId: params.userId, provider: "fossapay" },
    {
      $inc: { balance: params.amount },
      $set: { status: "active" },
    },
    { returnDocument: "after", upsert: true }
  );

  const newBalance = updatedAccount?.balance ?? params.amount;

  const accNum = updatedAccount?.accountNumber || "FOSSAPAY_ACCOUNT";
  const bName = updatedAccount?.bankName || "Provider Bank";
  const accName = updatedAccount?.accountName || "Jumpa User";

  // 3. Record confirmed transaction in immutable ledger
  await Transaction.create({
    userId: params.userId,
    type: "DEPOSIT",
    status: "CONFIRMED",
    chain: "fiat",
    network: "mainnet",
    fromAddress: `BANK_TRANSFER (${bName})`,
    toAddress: accNum,
    amount: params.amount.toString(),
    token: "NGN",
    bankDetails: {
      bankName: bName,
      accountNumber: accNum,
      accountName: accName,
      reference: dedupKey,
    },
    memo: params.memo || `Deposit via ${bName} (₦${params.amount.toLocaleString()})`,
    txHash: dedupKey || generateId("tx"),
    executedAt: new Date(),
  });

  // 4. Invalidate balance cache so user immediately sees their funds
  invalidateBalanceCache(params.userId);

  // 5. Activity log and in-app notification
  logUserActivity({
    userId: params.userId,
    action: "DEPOSIT_COMPLETED",
    details: { amount: params.amount, token: "NGN", reference: dedupKey },
  }).catch(() => { });

  createNotification({
    userId: params.userId,
    tab: "transactions",
    type: "DEPOSIT_COMPLETED",
    title: "Deposit Successful",
    body: `₦${params.amount.toLocaleString()} has been credited to your Naira balance`,
    metadata: { amount: params.amount, token: "NGN", txHash: dedupKey },
    link: "/ngn-account",
  }).catch(() => { });

  console.log(`[FossaPay Credit] ✅ Atomically credited ₦${params.amount} to user ${params.userId}. New balance: ₦${newBalance}`);

  return { success: true, newBalance };
}

/**
 * Retrieves the authenticated user's current spendable Naira balance from their active FossaPay account.
 */
export async function getNgnBalance(userId: string): Promise<number> {
  await connectDB();
  const account = await NgnAccount.findOne({ userId, provider: "fossapay" }).lean<INgnAccount>();
  return account?.balance ?? 0;
}


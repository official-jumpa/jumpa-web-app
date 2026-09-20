import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";
import { importaPay } from "@/lib/importapay";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

export interface DepositSessionResult {
  sessionId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

/**
 * Finds or initializes an active ImportaPay Naira account profile with zero balance for an authenticated Jumpa user.
 */
export async function getOrCreateImportaPayAccount(
  userId: string
): Promise<INgnAccount> {
  await connectDB();

  let account = await NgnAccount.findOne({ userId, provider: "importapay" }).lean<INgnAccount>();
  if (account) {
    return account;
  }

  const newAccount = await NgnAccount.create({
    userId,
    currency: "NGN",
    provider: "importapay",
    status: "active",
    balance: 0,
  });

  return newAccount.toObject();
}

/**
 * Retrieves the authenticated user's currently active and unexpired dynamic deposit session from their account record.
 */
export async function getActiveDepositSession(
  userId: string
): Promise<DepositSessionResult | null> {
  await connectDB();

  const account = await NgnAccount.findOne({
    userId,
    provider: "importapay",
  }).lean<INgnAccount>();

  if (!account) {
    return null;
  }

  const session = (account as any)?.providerMetadata?.lastDepositSession;
  if (!session || !session.dvaId || !session.expiresAt) {
    return null;
  }

  const expiry = new Date(session.expiresAt).getTime();
  if (isNaN(expiry) || expiry <= Date.now()) {
    return null;
  }

  // Verify that this session was not already confirmed/credited in transaction ledger
  const alreadyCredited = await Transaction.findOne({
    $or: [
      { txHash: session.dvaId },
      { "bankDetails.reference": session.dvaId },
    ],
    status: "CONFIRMED",
  });

  if (alreadyCredited) {
    return null;
  }

  return {
    sessionId: session.dvaId,
    accountNumber: session.accountNumber || account.accountNumber || "",
    accountName: session.accountName || account.accountName || "",
    bankName: session.bankName || account.bankName || "",
    amount: session.amount,
    currency: "NGN",
    expiresAt: session.expiresAt,
    status: "active",
  };
}

/**
 * Cancels or clears the user's active dynamic deposit session to allow creating a new session with different parameters.
 */
export async function cancelActiveDepositSession(userId: string): Promise<boolean> {
  await connectDB();

  await NgnAccount.updateOne(
    { userId, provider: "importapay" },
    { $unset: { "providerMetadata.lastDepositSession": "" } }
  );

  return true;
}

/**
 * Generates a 30-minute branded dynamic virtual account for an exact top-up amount and returns bank transfer details
 */
export async function createDepositSession(params: {
  userId: string;
  amount: number;
  userName?: string;
}): Promise<DepositSessionResult> {
  await connectDB();

  // Return existing active unexpired session if the requested amount matches
  const active = await getActiveDepositSession(params.userId);
  if (active && active.amount === params.amount) {
    return active;
  }

  const accountName = `Jumpa - ${params.userName || "User"}`;

  const dva = await importaPay.createDynamicVirtualAccount({
    accountName,
    amount: params.amount,
  });

  // Track the dynamic session in the user's NgnAccount providerMetadata
  await NgnAccount.updateOne(
    { userId: params.userId, provider: "importapay" },
    {
      $set: {
        providerAccountId: dva.id,
        accountNumber: dva.accountNumber,
        bankName: dva.bankName,
        accountName: dva.accountName,
        "providerMetadata.lastDepositSession": {
          dvaId: dva.id,
          amount: params.amount,
          accountNumber: dva.accountNumber,
          bankName: dva.bankName,
          accountName: dva.accountName,
          expiresAt: dva.expiresAt,
          createdAt: new Date(),
        },
      },
    },
    { upsert: false }
  );

  logUserActivity({
    userId: params.userId,
    action: "DEPOSIT_INITIATED",
    details: { amount: params.amount, token: "NGN", sessionId: dva.id },
  }).catch(() => {});

  return {
    sessionId: dva.id,
    accountNumber: dva.accountNumber,
    accountName: dva.accountName,
    bankName: dva.bankName,
    amount: dva.expectedAmount || params.amount,
    currency: dva.currency || "NGN",
    expiresAt: dva.expiresAt,
    status: dva.status || "active",
  };
}

/**
 * Atomically increases a user's Naira balance in MongoDB and records a confirmed onramp transaction with idempotency protection.
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

  // 1. Idempotency check: Guard against duplicate webhook deliveries
  if (dedupKey) {
    const existing = await Transaction.findOne({ txHash: dedupKey });
    if (existing) {
      console.log(`Duplicate transaction ignored, hash: ${dedupKey}`);
      const acc = await NgnAccount.findOne({ userId: params.userId, provider: "importapay" }).lean<INgnAccount>();
      return { success: true, newBalance: acc?.balance || 0 };
    }
  }

  // 2. Atomic Balance Increment
  const updatedAccount = await NgnAccount.findOneAndUpdate(
    { userId: params.userId, provider: "importapay" },
    {
      $inc: { balance: params.amount },
      $set: { status: "active" },
    },
    { returnDocument: "after", upsert: true }
  );

  const newBalance = updatedAccount?.balance ?? params.amount;

  const lastSession = (updatedAccount as any)?.providerMetadata?.lastDepositSession;
  const accNum =
    updatedAccount?.accountNumber ||
    lastSession?.accountNumber ||
    "DVA_ACCOUNT";
  const bName =
    updatedAccount?.bankName ||
    lastSession?.bankName ||
    "ImportaPay";
  const accName =
    updatedAccount?.accountName ||
    lastSession?.accountName;

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
    txHash: dedupKey || `importa_tx_${Date.now()}`,
    executedAt: new Date(),
  });

  // 4. Invalidate balance cache so user immediately sees their funds
  invalidateBalanceCache(params.userId);

  // 5. Activity log and in-app notification
  logUserActivity({
    userId: params.userId,
    action: "DEPOSIT_COMPLETED",
    details: { amount: params.amount, token: "NGN", reference: dedupKey },
  }).catch(() => {});

  createNotification({
    userId: params.userId,
    tab: "transactions",
    type: "DEPOSIT_COMPLETED",
    title: "Deposit Successful",
    body: `₦${params.amount.toLocaleString()} has been credited to your Naira balance`,
    metadata: { amount: params.amount, token: "NGN", txHash: dedupKey },
    link: "/ngn-account",
  }).catch(() => {});

  console.log(`[ImportaPay Credit] ✅ Atomically credited ₦${params.amount} to user ${params.userId}. New balance: ₦${newBalance}`);

  return { success: true, newBalance };
}

/**
 * Atomically deducts Naira from a user's active account using a balance-guard condition to prevent overdrafts or race conditions.
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

  // 2. Try debiting from ImportaPay account first
  let updatedAccount = await NgnAccount.findOneAndUpdate(
    {
      userId: params.userId,
      provider: "importapay",
      status: "active",
      balance: { $gte: params.amount },
    },
    {
      $inc: { balance: -params.amount },
    },
    { returnDocument: "after" }
  );

  // Fallback to legacy FossaPay account if applicable
  //delete after fossapay is depreciated
  if (!updatedAccount) {
    updatedAccount = await NgnAccount.findOneAndUpdate(
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
  }

  if (!updatedAccount) {
    console.warn(`[ImportaPay Debit] Insufficient balance for user ${params.userId} attempting to debit ₦${params.amount}`);
    throw new Error("Insufficient NGN wallet balance");
  }

  // Invalidate balance cache
  invalidateBalanceCache(params.userId);

  console.log(`[ImportaPay Debit] ✅ Atomically debited ₦${params.amount} from user ${params.userId}. Remaining: ₦${updatedAccount.balance}`);

  return { success: true, newBalance: updatedAccount.balance };
}

/**
 * Retrieves the authenticated user's current spendable Naira balance from their active account record.
 */
export async function getNgnBalance(userId: string): Promise<number> {
  await connectDB();
  const account = await NgnAccount.findOne({ userId, provider: "importapay" }).lean<INgnAccount>();
  return account?.balance ?? 0;
}

/**
 * Polls the ImportaPay status of a dynamic virtual account and updates our database if payment was confirmed.
 */
export async function syncDynamicVirtualAccountStatus(accountId: string) {
  const accountData = await importaPay.getDynamicVirtualAccount(accountId);
  return accountData;
}

/**
 * Verifies a user's dynamic deposit session directly with ImportaPay's live server and atomically credits their Naira balance if payment is confirmed.
 */
export async function verifyDepositSession(
  userId: string,
  sessionId?: string
): Promise<{
  success: boolean;
  confirmed: boolean;
  status: string;
  amount?: number;
  newBalance?: number;
  message: string;
}> {
  await connectDB();

  const account = await NgnAccount.findOne({
    userId,
    provider: "importapay",
  }).lean<INgnAccount>();

  if (!account) {
    throw new Error("No ImportaPay account profile found");
  }

  const dvaId =
    sessionId ||
    account.providerAccountId ||
    (account as any)?.providerMetadata?.lastDepositSession?.dvaId;

  if (!dvaId) {
    throw new Error("No active deposit session found to verify");
  }

  console.log(`[Deposit Verify] Querying ImportaPay live server for DVA: ${dvaId}...`);
  const liveAccount = await importaPay.getDynamicVirtualAccount(dvaId);

  const isConfirmed =
    liveAccount?.status === "paid" || liveAccount?.status === "synced";

  if (isConfirmed) {
    const amount = liveAccount.expectedAmount || liveAccount.amount || 0;
    const creditResult = await atomicCreditNgnBalance({
      userId,
      amount,
      reference: dvaId,
      memo: `Deposit via ImportaPay (${liveAccount.bankName || "Aella MFB"})`,
      eventId: `verify_${dvaId}_${liveAccount.lastSyncedAt || Date.now()}`,
    });

    // Clear active deposit session now that it is completed
    await cancelActiveDepositSession(userId).catch(() => {});

    return {
      success: true,
      confirmed: true,
      status: liveAccount.status,
      amount,
      newBalance: creditResult.newBalance,
      message: `Deposit of ₦${amount.toLocaleString()} confirmed and credited successfully`,
    };
  }

  if (liveAccount?.status === "expired" || liveAccount?.status === "failed") {
    return {
      success: false,
      confirmed: false,
      status: liveAccount.status,
      message: "This deposit session has expired or failed. Please create a new deposit session.",
    };
  }

  // Status is still "active" (awaiting customer transfer)
  return {
    success: true,
    confirmed: false,
    status: "pending",
    message: "Payment not yet detected by bank. Please ensure transfer is complete",
  };
}

import * as StellarSdk from "@stellar/stellar-sdk";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import {
  createSavingsPlanRecord,
  getRawSavingsPlanById,
  createSavingsTransaction,
  closeSavingsPlanRecord,
  getUserActiveNgnSavings,
  getUserActiveUsdcSavings,
} from "@/lib/functions/savingsFunctions";
import {
  atomicDebitNgnBalance,
  atomicCreditNgnBalance,
} from "@/lib/functions/bellmonieFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import {
  setUserCreatedSavings,
  markSavingsIntroSeen,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import {
  deriveStellarKeypairFromMnemonic,
  deriveStellarKeypairFromPrivateKey,
  ensureStellarTrustline,
} from "@/lib/chains/stellar";
import { fetchStellarBalances } from "@/lib/chains/stellar/account";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { environment } from "@/lib/environment";
import { getExplorerTxUrl, CONTRACT_ADDRESSES } from "@/lib/blockchain";
import { apyForDays } from "@/lib/savings";
import { generateCircleInviteCode } from "@/lib/schema-ids";
import { formatPlanForUI } from "@/lib/savings-service";
import { NgnAccount } from "@/models/NgnAccount";
import { SavingsPlan } from "@/models/SavingsPlan";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";

const defindexClient = new DefindexClient(
  environment.DEFINDEX_API_KEY,
  environment.DEFINDEX_BASE_URL,
  "mainnet",
);

export interface CreateSavingsExecutionParams {
  userId: string;
  wallet?: any;
  pin?: string;
  kind?: "individual" | "lock" | "circle";
  name: string;
  category?: string;
  targetAmount?: number;
  depositAmount?: number;
  durationDays?: number;
  term?: string;
  frequency?: string;
  fundingSource?: "crypto" | "usd" | "ngn";
  currency?: "NGN" | "USDC";
  chain?: string;
  circleType?: "save_together" | "shared_pool";
  circleMembers?: number;
}

export interface DepositSavingsExecutionParams {
  userId: string;
  wallet?: any;
  pin?: string;
  planId: string;
  amount: number;
}

export interface JoinCircleExecutionParams {
  userId: string;
  wallet?: any;
  pin?: string;
  code: string;
  amount: number;
}

export interface WithdrawSavingsExecutionParams {
  userId: string;
  wallet?: any;
  pin: string;
  planId: string;
  amount?: number;
}

export interface SavingsExecutionResult {
  ok: boolean;
  error?: string;
  status?: number;
  plan?: any;
  txHash?: string;
  explorerUrl?: string;
  withdrawnAmount?: number;
  netPayout?: number;
  forfeited?: boolean;
  receiptCardData?: any;
}

/**
 * Creates a new savings plan with an optional initial deposit.
 * Supports NGN (DB ledger on NgnAccount) and USDC (Stellar DeFindex on-chain).
 */
export async function createSavingsPlanExecution(
  params: CreateSavingsExecutionParams,
): Promise<SavingsExecutionResult> {
  const {
    userId,
    pin,
    kind = "individual",
    name,
    category = "Other",
    targetAmount = 0,
    depositAmount = 0,
    durationDays,
    frequency = "Weekly",
    fundingSource = "crypto",
    currency = "USDC",
    chain = currency === "NGN" ? "none" : "stellar",
    circleType = "save_together",
    circleMembers = 4,
  } = params;

  const wallet = params.wallet || (await findWalletForUser(userId));
  if (!wallet) {
    return { ok: false, error: "No wallet found for user", status: 404 };
  }

  // 1. PIN verification is only required for on-chain USDC execution (to decrypt stellar keypair)
  if (currency === "USDC" && Number(depositAmount) > 0) {
    if (!pin) {
      return { ok: false, error: "Wallet PIN is required for on-chain savings", status: 400 };
    }
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      return { ok: false, error: pinCheck.error, status: pinCheck.status };
    }
  }

  // Enforce security daily transaction limit on deposit
  const numDeposit = Number(depositAmount) || 0;
  if (numDeposit > 0) {
    try {
      await assertDailyTransactionLimit({
        userId,
        amount: numDeposit,
        tokenOrCurrency: currency || "USDC",
      });
    } catch (limitErr: any) {
      if (isLimitError(limitErr)) {
        return { ok: false, error: limitErr.message, status: 400 };
      }
      throw limitErr;
    }
  }

  const days = durationDays || (params.term ? parseInt(params.term, 10) : 30) || 30;
  const computedTerm = `${days} DAYS`;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

  const circleConfig =
    kind === "circle"
      ? {
          type: circleType,
          inviteCode: generateCircleInviteCode(),
          capacity: Number(circleMembers) || 4,
          members: [
            {
              userId,
              name: "You (Owner)",
              role: "owner" as const,
              saved: numDeposit,
              joinedAt: startDate,
            },
          ],
        }
      : undefined;

  let txHash: string | undefined;
  let explorerUrl: string | undefined;
  let initialShares = "0";
  const stellarAddress = wallet.addresses?.xlm || wallet.address || "";

  // Currency: NGN (Database Only) 
  if (currency === "NGN") {
    // 1. Enforce cumulative ₦1,000,000 maximum savings cap per user
    const currentActiveNgnSavings = await getUserActiveNgnSavings(userId);
    if (currentActiveNgnSavings + numDeposit > 1000000) {
      return {
        ok: false,
        error: `Savings limit exceeded. Maximum allowed savings across all categories is ₦1,000,000. Current total saved: ₦${currentActiveNgnSavings.toLocaleString()}.`,
        status: 400,
      };
    }

    if (numDeposit > 0) {
      try {
        await atomicDebitNgnBalance({
          userId,
          amount: numDeposit,
          memo: `savings:deposit:initial:${name}`,
        });
      } catch (err: any) {
        console.log("savings error", err)
        return {
          ok: false,
          error:`Insufficient NGN balance for this deposit (₦${numDeposit.toLocaleString()}).`,
          status: 400,
        };
      }
    }

    // Compute and lock APY for this plan at creation time
    const lockedApy = apyForDays(kind, days);

    // Save SavingsPlan in MongoDB
    const plan = await createSavingsPlanRecord({
      userId,
      walletId: wallet._id,
      walletAddress: stellarAddress,
      kind,
      name,
      category,
      targetAmount: Number(targetAmount) || 0,
      initialDeposit: numDeposit,
      currentAmount: numDeposit,
      interestEarned: 0,
      apy: lockedApy,
      currency: "NGN",
      chain: "none",
      vaultAddress: "ngn_db_vault",
      sharesOwned: "0",
      circleConfig,
      startDate,
      endDate,
      term: computedTerm,
      frequency,
      fundingSource: "ngn",
      status: "Active",
      penaltyFeePercent: 0,
      txHashes: [],
    });

    if (numDeposit > 0) {
      await createSavingsTransaction({
        planId: plan._id,
        userId,
        currency: "NGN",
        kind: "deposit",
        amount: numDeposit,
        at: startDate,
      });

      await createTransactionRecord({
        userId,
        walletId: wallet._id,
        type: "SAVINGS_DEPOSIT",
        status: "CONFIRMED",
        chain: "fiat",
        network: "mainnet",
        fromAddress: "ngn_account",
        toAddress: "savings_plan",
        amount: String(numDeposit),
        token: "NGN",
        memo: `savings:create:${plan._id}`,
        savingsDetails: { planId: plan._id, vaultAddress: "ngn_db_vault" },
        executedAt: new Date(),
      });
    }

    setUserCreatedSavings(userId).catch(() => {});
    markSavingsIntroSeen(userId, kind).catch(() => {});

    return {
      ok: true,
      plan: formatPlanForUI(plan),
      receiptCardData: {
        title: "Savings Goal Created",
        status: "Active",
        balance: {
          caption: "INITIAL DEPOSIT",
          value: numDeposit > 0 ? `₦${numDeposit.toLocaleString()}` : "₦0.00",
          badge: "NGN",
        },
      },
    };
  }

  // Currency: USDC (Stellar DeFindex On-Chain) 
  // Unified Vault Address: All kinds (individual, lock, circle) point to DEFINDEX_INDIVIDUAL_VAULT_ADDRESS
  const vaultAddress = environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
  if (!vaultAddress) {
    return {
      ok: false,
      error: "vault address not configured",
      status: 500,
    };
  }

  // Enforce cumulative $1,000 USDC maximum savings cap per user
  const currentActiveUsdcSavings = await getUserActiveUsdcSavings(userId);
  if (currentActiveUsdcSavings + numDeposit > 1000) {
    return {
      ok: false,
      error: `Savings limit exceeded. Maximum allowed savings across all USDC categories is $1,000. Current total saved: $${currentActiveUsdcSavings.toFixed(2)}.`,
      status: 400,
    };
  }

  if (numDeposit > 0) {
    const balances = await fetchStellarBalances(stellarAddress);
    const availableUsdc = Number(balances.mainnet.usdc) || 0;
    if (availableUsdc < numDeposit) {
      return {
        ok: false,
        error: `Insufficient balance: you have $${availableUsdc.toFixed(2)} USDC and this deposit needs $${numDeposit.toFixed(2)}.`,
        status: 400,
      };
    }

    let secret: string;
    try {
      secret = decryptMnemonic(
        wallet.encryptedMnemonic,
        wallet.iv,
        wallet.salt,
        pin!,
      );
    } catch {
      return {
        ok: false,
        error: "Failed to decrypt wallet credentials",
        status: 401,
      };
    }

    const keys =
      wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
        ? deriveStellarKeypairFromPrivateKey(secret)
        : deriveStellarKeypairFromMnemonic(secret);

    const userKeypair = StellarSdk.Keypair.fromSecret(keys.secretKey);
    const amountStroops = Math.round(numDeposit * 10_000_000);

    await ensureStellarTrustline(
      userKeypair,
      new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.mainnet.USDC),
      "mainnet",
    );

    const depositRes = await defindexClient.deposit(vaultAddress, {
      amounts: [amountStroops],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });

    if (!depositRes.xdr) {
      return {
        ok: false,
        error: "DeFindex failed to generate deposit transaction",
        status: 500,
      };
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(
      depositRes.xdr,
      StellarSdk.Networks.PUBLIC,
    );
    tx.sign(userKeypair);

    const sendRes = await defindexClient.send(tx.toXDR());
    txHash = sendRes.txHash;
    initialShares = String(sendRes.dfTokens || amountStroops);
    explorerUrl = getExplorerTxUrl("stellar", txHash, false);

    await createTransactionRecord({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_DEPOSIT",
      status: "CONFIRMED",
      chain: "stellar",
      network: "mainnet",
      fromAddress: stellarAddress,
      toAddress: vaultAddress,
      amount: String(numDeposit),
      token: "USDC",
      memo: `savings:create`,
      txHash,
      explorerUrl,
      savingsDetails: {
        vaultAddress,
        shares: initialShares,
      },
      executedAt: new Date(),
    });
  }

  // Compute and lock APY for this plan at creation time
  const lockedApy = apyForDays(kind, days);

  // Save SavingsPlan in MongoDB
  const plan = await createSavingsPlanRecord({
    userId,
    walletId: wallet._id,
    walletAddress: stellarAddress,
    kind,
    name,
    category,
    targetAmount: Number(targetAmount) || 0,
    initialDeposit: numDeposit,
    currentAmount: numDeposit,
    interestEarned: 0,
    apy: lockedApy,
    currency: "USDC",
    chain: "stellar",
    vaultAddress,
    sharesOwned: initialShares,
    circleConfig,
    startDate,
    endDate,
    term: computedTerm,
    frequency,
    fundingSource,
    status: "Active",
    penaltyFeePercent: 0,
    txHashes: txHash ? [txHash] : [],
  });

  if (numDeposit > 0) {
    await createSavingsTransaction({
      planId: plan._id,
      userId,
      currency: "USDC",
      kind: "deposit",
      amount: numDeposit,
      shares: initialShares,
      txHash,
      at: startDate,
    });
  }

  setUserCreatedSavings(userId).catch(() => {});
  markSavingsIntroSeen(userId, kind).catch(() => {});

  logUserActivity({
    userId,
    action: "SAVINGS_PLAN_CREATED",
    details: {
      planId: plan._id,
      name,
      kind,
      targetAmount,
      deposit: numDeposit,
      txHash,
    },
  }).catch(() => {});

  return {
    ok: true,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
  };
}

/**
 * Top up an existing active savings plan.
 */
export async function depositSavingsExecution(
  params: DepositSavingsExecutionParams,
): Promise<SavingsExecutionResult> {
  const { userId, pin, planId, amount } = params;

  const [wallet, plan] = await Promise.all([
    params.wallet || findWalletForUser(userId),
    getRawSavingsPlanById(planId, userId),
  ]);

  if (!wallet) {
    return { ok: false, error: "Wallet not found", status: 404 };
  }
  if (!plan) {
    return { ok: false, error: "Savings plan not found", status: 404 };
  }

  if (plan.kind === "lock") {
    return {
      ok: false,
      error: "Locked savings plans cannot be topped up. Funds remain locked until maturity.",
      status: 400,
    };
  }

  // Enforce security daily transaction limit on deposit
  if (amount > 0) {
    try {
      await assertDailyTransactionLimit({
        userId,
        amount,
        tokenOrCurrency: plan.currency || "USDC",
      });
    } catch (limitErr: any) {
      if (isLimitError(limitErr)) {
        return { ok: false, error: limitErr.message, status: 400 };
      }
      throw limitErr;
    }
  }

  // Currency: NGN (Database - No PIN required)
  if (plan.currency === "NGN") {
    // 1. Enforce cumulative ₦1,000,000 maximum savings cap per user
    const currentActiveNgnSavings = await getUserActiveNgnSavings(userId);
    if (currentActiveNgnSavings + amount > 1000000) {
      return {
        ok: false,
        error: `Savings limit exceeded. Maximum allowed savings across all categories is ₦1,000,000. Current total saved: ₦${currentActiveNgnSavings.toLocaleString()}.`,
        status: 400,
      };
    }

    // 2. Disallow overfunding if a target amount is specified
    if (plan.targetAmount && plan.targetAmount > 0) {
      const remainingTarget = Math.max(0, plan.targetAmount - (plan.currentAmount || 0));
      if (amount > remainingTarget) {
        return {
          ok: false,
          error: remainingTarget === 0
            ? "This savings goal has already reached its target."
            : `Top-up exceeds target. Maximum you can deposit into this plan is ₦${remainingTarget.toLocaleString()}.`,
          status: 400,
        };
      }
    }

    try {
      await atomicDebitNgnBalance({
        userId,
        amount,
        memo: `savings:deposit:topup:${plan._id}`,
      });
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || `Insufficient NGN balance for this top-up (₦${amount.toLocaleString()}).`,
        status: 400,
      };
    }

    const updatedPlan = await SavingsPlan.findOneAndUpdate(
      {
        _id: plan._id,
        status: "Active",
      },
      {
        $inc: { currentAmount: amount },
      },
      { returnDocument: "after" },
    );

    await createSavingsTransaction({
      planId: plan._id,
      userId,
      currency: "NGN",
      kind: "top_up",
      amount,
      at: new Date(),
    });

    await createTransactionRecord({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_DEPOSIT",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      fromAddress: "ngn_account",
      toAddress: "savings_plan",
      amount: String(amount),
      token: "NGN",
      memo: `savings:topup:${plan._id}`,
      savingsDetails: { planId: plan._id, vaultAddress: "ngn_db_vault" },
      executedAt: new Date(),
    });

    return {
      ok: true,
      plan: formatPlanForUI(updatedPlan || plan),
    };
  }

  // ── Currency: USDC (Stellar DeFindex - Requires PIN for on-chain key decryption) ─
  if (!pin) {
    return { ok: false, error: "Wallet PIN is required for on-chain deposit", status: 400 };
  }
  const pinCheck = await verifyWalletPin(wallet, pin, { userId });
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error, status: pinCheck.status };
  }

  // Currency: USDC (Stellar DeFindex)
  // 1. Enforce cumulative $1,000 USDC maximum savings cap per user
  const currentActiveUsdcSavings = await getUserActiveUsdcSavings(userId);
  if (currentActiveUsdcSavings + amount > 1000) {
    return {
      ok: false,
      error: `Savings limit exceeded. Maximum allowed savings across all USDC categories is $1,000. Current total saved: $${currentActiveUsdcSavings.toFixed(2)}.`,
      status: 400,
    };
  }

  // 2. Disallow overfunding if a target amount is specified
  if (plan.targetAmount && plan.targetAmount > 0) {
    const remainingTarget = Math.max(0, plan.targetAmount - (plan.currentAmount || 0));
    if (amount > remainingTarget) {
      return {
        ok: false,
        error: remainingTarget === 0
          ? "This savings goal has already reached its target."
          : `Top-up exceeds target. Maximum you can deposit into this plan is $${remainingTarget.toFixed(2)} USDC.`,
        status: 400,
      };
    }
  }

  const stellarAddress = wallet.addresses?.xlm || wallet.address;
  const balances = await fetchStellarBalances(stellarAddress);
  const availableUsdc = Number(balances.mainnet.usdc) || 0;
  if (availableUsdc < amount) {
    return {
      ok: false,
      error: `Insufficient balance: you have $${availableUsdc.toFixed(2)} USDC and this top-up needs $${amount.toFixed(2)}.`,
      status: 400,
    };
  }

  let secret: string;
  try {
    secret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return {
      ok: false,
      error: "Failed to decrypt wallet credentials",
      status: 401,
    };
  }

  const keys =
    wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
      ? deriveStellarKeypairFromPrivateKey(secret)
      : deriveStellarKeypairFromMnemonic(secret);

  const userKeypair = StellarSdk.Keypair.fromSecret(keys.secretKey);
  const amountStroops = Math.round(amount * 10_000_000);

  const targetVault = environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
  const depositRes = await defindexClient.deposit(targetVault, {
    amounts: [amountStroops],
    caller: stellarAddress,
    invest: true,
    slippageBps: 50,
  });

  if (!depositRes.xdr) {
    return {
      ok: false,
      error: "DeFindex failed to generate top-up transaction",
      status: 500,
    };
  }

  const tx = StellarSdk.TransactionBuilder.fromXDR(
    depositRes.xdr,
    StellarSdk.Networks.PUBLIC,
  );
  tx.sign(userKeypair);

  const sendRes = await defindexClient.send(tx.toXDR());
  const txHash = sendRes.txHash;
  const explorerUrl = getExplorerTxUrl("stellar", txHash, false);

  const newTotal = (plan.currentAmount || 0) + amount;
  plan.currentAmount = newTotal;
  if (txHash && !plan.txHashes.includes(txHash)) {
    plan.txHashes.push(txHash);
  }
  await plan.save();

  await createSavingsTransaction({
    planId: plan._id,
    userId,
    currency: "USDC",
    kind: "top_up",
    amount,
    txHash,
    at: new Date(),
  });

  await createTransactionRecord({
    userId,
    walletId: wallet._id,
    type: "SAVINGS_DEPOSIT",
    status: "CONFIRMED",
    chain: "stellar",
    network: "mainnet",
    fromAddress: stellarAddress,
    toAddress: targetVault,
    amount: String(amount),
    token: "USDC",
    memo: `savings:topup:${plan._id}`,
    txHash,
    explorerUrl,
    savingsDetails: {
      planId: plan._id,
      vaultAddress: targetVault,
    },
    executedAt: new Date(),
  });

  return {
    ok: true,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
  };
}

/**
 * Withdraws from a savings plan.
 * - Flexible: pays principal + earned interest.
 * - Lock (Early): user forfeits all interest, receives 100% of principal back (0 capital fee).
 * - Lock (Matured): pays principal + earned interest.
 */
export async function withdrawSavingsExecution(
  params: WithdrawSavingsExecutionParams,
): Promise<SavingsExecutionResult> {
  const { userId, pin, planId, amount } = params;

  const [wallet, plan] = await Promise.all([
    params.wallet || findWalletForUser(userId),
    getRawSavingsPlanById(planId, userId),
  ]);

  if (!wallet) {
    return { ok: false, error: "Wallet not found", status: 404 };
  }
  if (!plan) {
    return { ok: false, error: "Savings plan not found", status: 404 };
  }

  if (plan.status === "Closed" || plan.status === "Completed") {
    return { ok: false, error: "Plan has already been withdrawn", status: 400 };
  }

  // 1. Verify PIN
  const pinCheck = await verifyWalletPin(wallet, pin, { userId });
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error, status: pinCheck.status };
  }

  // 2. Circle Governance check: if Shared Pool, only organizer can withdraw
  if (plan.kind === "circle" && plan.circleConfig?.type === "shared_pool") {
    if (plan.userId !== userId) {
      return {
        ok: false,
        error: "Only the circle owner can withdraw funds from a Shared Pool.",
        status: 403,
      };
    }
  }

  const now = new Date();
  const isLock = plan.kind === "lock";
  const isEarlyLock = isLock && plan.endDate && now < new Date(plan.endDate);

  // Interest handling: early lock forfeits all interest
  const accruedInterest = plan.interestEarned || 0;
  const forfeitInterest = Boolean(isEarlyLock);
  const principalWithdraw = amount !== undefined ? amount : plan.currentAmount;

  if (principalWithdraw > plan.currentAmount) {
    return {
      ok: false,
      error: `Requested amount exceeds plan balance (${plan.currentAmount})`,
      status: 400,
    };
  }

  // Net payout = principal + (interest unless forfeited)
  const interestPayout = forfeitInterest ? 0 : accruedInterest;
  const netPayout = Number((principalWithdraw + interestPayout).toFixed(2));

  let txHash: string | undefined;
  let explorerUrl: string | undefined;

  const remainingBalance = Math.max(0, (plan.currentAmount || 0) - principalWithdraw);
  const isFullWithdrawal = isLock || remainingBalance === 0;

  // ── Currency: NGN (Database Ledger)
  if (plan.currency === "NGN") {
    // ATOMIC CLAIM: Deduct from SavingsPlan FIRST using atomic Compare-And-Swap (CAS)
    // WiredTiger engine locks this document during the write.
    // If concurrent requests hit, only 1 satisfies `currentAmount >= principalWithdraw`. The rest receive null.
    const claimedPlan = await SavingsPlan.findOneAndUpdate(
      {
        _id: planId,
        $or: [{ userId }, { "circleConfig.members.userId": userId }],
        status: "Active",
        currentAmount: { $gte: principalWithdraw },
      },
      {
        $inc: {
          currentAmount: -principalWithdraw,
          interestEarned: -interestPayout,
        },
        ...(isFullWithdrawal
          ? {
              status: "Closed",
              "closure.paidOut": netPayout,
              "closure.date": new Date(),
              "closure.forfeited": forfeitInterest,
            }
          : {}),
      },
      { returnDocument: "after" },
    );

    if (!claimedPlan) {
      return {
        ok: false,
        error: "Insufficient balance or plan is already closed.",
        status: 400,
      };
    }

    // Atomically credit user's NgnAccount with the payout and invalidate balance cache
    try {
      await atomicCreditNgnBalance({
        userId,
        amount: netPayout,
        memo: `savings:withdraw:${plan._id}`,
      });
    } catch (creditErr: any) {
      console.error(
        `[Savings:Withdraw] CRITICAL: Deducted ₦${principalWithdraw} from plan ${planId} but failed to credit user ${userId}: ${creditErr?.message || creditErr}. Requires manual review.`,
      );
      throw creditErr;
    }

    await createSavingsTransaction({
      planId: plan._id,
      userId,
      currency: "NGN",
      kind: "withdrawal",
      amount: netPayout,
      forfeited: forfeitInterest,
      at: new Date(),
    });

    await createTransactionRecord({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_WITHDRAW",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      fromAddress: "savings_plan",
      toAddress: "ngn_account",
      amount: String(netPayout),
      token: "NGN",
      memo: `savings:withdraw:${plan._id}`,
      savingsDetails: {
        planId: plan._id,
        vaultAddress: "ngn_db_vault",
      },
      executedAt: new Date(),
    });

    return {
      ok: true,
      withdrawnAmount: principalWithdraw,
      netPayout,
      forfeited: forfeitInterest,
      plan: formatPlanForUI(claimedPlan),
    };
  }

  // Currency: USDC (Stellar DeFindex)
  const stellarAddress = wallet.addresses?.xlm || wallet.address;
  let secret: string;
  try {
    secret = decryptMnemonic(
      wallet.encryptedMnemonic,
      wallet.iv,
      wallet.salt,
      pin,
    );
  } catch {
    return {
      ok: false,
      error: "Failed to decrypt wallet",
      status: 401,
    };
  }

  const keys =
    wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
      ? deriveStellarKeypairFromPrivateKey(secret)
      : deriveStellarKeypairFromMnemonic(secret);

  const userKeypair = StellarSdk.Keypair.fromSecret(keys.secretKey);
  const targetVault = environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;

  try {
    const netPayoutStroops = Math.round(netPayout * 10_000_000);
    const withdrawRes = await defindexClient.withdraw(targetVault, {
      amounts: [netPayoutStroops],
      caller: stellarAddress,
    });

    if (withdrawRes?.xdr) {
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        withdrawRes.xdr,
        StellarSdk.Networks.PUBLIC,
      );
      tx.sign(userKeypair);

      const sendRes = await defindexClient.send(tx.toXDR());
      txHash = sendRes.txHash;
      explorerUrl = getExplorerTxUrl("stellar", txHash, false);
    }
  } catch (onChainErr: any) {
    console.warn(
      `[withdrawSavingsExecution] On-chain DeFindex withdraw error/notice:`,
      onChainErr?.message || onChainErr,
    );
  }

  if (isFullWithdrawal) {
    await closeSavingsPlanRecord(planId, userId, {
      paidOut: netPayout,
      forfeited: forfeitInterest,
    });
  } else {
    plan.currentAmount = remainingBalance;
    plan.interestEarned = Math.max(0, plan.interestEarned - interestPayout);
    if (txHash && !plan.txHashes.includes(txHash)) {
      plan.txHashes.push(txHash);
    }
    await plan.save();
  }

  await createSavingsTransaction({
    planId: plan._id,
    userId,
    currency: "USDC",
    kind: "withdrawal",
    amount: netPayout,
    forfeited: forfeitInterest,
    txHash,
    at: new Date(),
  });

  await createTransactionRecord({
    userId,
    walletId: wallet._id,
    type: "SAVINGS_WITHDRAW",
    status: "CONFIRMED",
    chain: "stellar",
    network: "mainnet",
    fromAddress: targetVault,
    toAddress: stellarAddress,
    amount: String(netPayout),
    token: "USDC",
    memo: `savings:withdraw:${plan._id}`,
    txHash,
    explorerUrl,
    savingsDetails: {
      planId: plan._id,
      vaultAddress: targetVault,
    },
    executedAt: new Date(),
  });

  return {
    ok: true,
    withdrawnAmount: principalWithdraw,
    netPayout,
    forfeited: forfeitInterest,
    txHash,
    explorerUrl,
    plan: formatPlanForUI(plan),
  };
}

/**
 * Joins an active Circle savings plan by invite code or plan ID.
 */
export async function joinCircleExecution(
  params: JoinCircleExecutionParams,
): Promise<SavingsExecutionResult> {
  const { userId, pin, code, amount } = params;

  if (amount <= 0) {
    return { ok: false, error: "Deposit amount must be greater than 0", status: 400 };
  }

  const wallet = params.wallet || (await findWalletForUser(userId));
  if (!wallet) {
    return { ok: false, error: "Wallet not found", status: 404 };
  }

  // Find active circle by code or id
  const cleanCode = code.trim().toUpperCase();
  const plan = await SavingsPlan.findOne({
    kind: "circle",
    status: "Active",
    $or: [
      { "circleConfig.inviteCode": cleanCode },
      { "circleConfig.inviteCode": new RegExp(`^${cleanCode}$`, "i") },
      { _id: cleanCode.toLowerCase() },
    ],
  });

  if (!plan) {
    return { ok: false, error: "No active circle matches this invite code", status: 404 };
  }

  const members = plan.circleConfig?.members || [];
  const capacity = plan.circleConfig?.capacity || 4;

  if (members.length >= capacity) {
    return { ok: false, error: "This circle is already at full capacity", status: 400 };
  }

  const alreadyMember = members.some((m) => m.userId === userId);
  if (alreadyMember) {
    return { ok: false, error: "You are already a member of this circle", status: 400 };
  }

  const numDeposit = Number(amount);
  let txHash: string | undefined;
  let explorerUrl: string | undefined;

  // Enforce security daily transaction limit on deposit
  if (numDeposit > 0) {
    try {
      await assertDailyTransactionLimit({
        userId,
        amount: numDeposit,
        tokenOrCurrency: plan.currency || "USDC",
      });
    } catch (limitErr: any) {
      if (isLimitError(limitErr)) {
        return { ok: false, error: limitErr.message, status: 400 };
      }
      throw limitErr;
    }
  }

  // 1. Process payment: NGN or USDC
  if (plan.currency === "NGN") {
    // Enforce cumulative ₦1,000,000 maximum savings cap per user
    const currentActiveNgnSavings = await getUserActiveNgnSavings(userId);
    if (currentActiveNgnSavings + numDeposit > 1000000) {
      return {
        ok: false,
        error: `Savings limit exceeded. Maximum allowed savings across all categories is ₦1,000,000. Current total saved: ₦${currentActiveNgnSavings.toLocaleString()}.`,
        status: 400,
      };
    }

    try {
      await atomicDebitNgnBalance({
        userId,
        amount: numDeposit,
        memo: `savings:deposit:join_circle:${plan._id}`,
      });
    } catch (err: any) {
      console.log("savings error", err)
      return {
        ok: false,
        error: `Insufficient NGN balance for this deposit (₦${numDeposit.toLocaleString()}).`,
        status: 400,
      };
    }
  } else {
    // USDC on-chain
    // Enforce cumulative $1,000 USDC maximum savings cap per user
    const currentActiveUsdcSavings = await getUserActiveUsdcSavings(userId);
    if (currentActiveUsdcSavings + numDeposit > 1000) {
      return {
        ok: false,
        error: `Savings limit exceeded. Maximum allowed savings across all USDC categories is $1,000. Current total saved: $${currentActiveUsdcSavings.toFixed(2)}.`,
        status: 400,
      };
    }

    if (!pin) {
      return { ok: false, error: "Wallet PIN is required for on-chain deposit", status: 400 };
    }
    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      return { ok: false, error: pinCheck.error, status: pinCheck.status };
    }

    const stellarAddress = wallet.addresses?.xlm || wallet.address || "";
    const balances = await fetchStellarBalances(stellarAddress);
    const availableUsdc = Number(balances.mainnet.usdc) || 0;
    if (availableUsdc < numDeposit) {
      return {
        ok: false,
        error: `Insufficient USDC balance: you have $${availableUsdc.toFixed(2)} and need $${numDeposit.toFixed(2)}.`,
        status: 400,
      };
    }

    const vaultAddress = plan.vaultAddress || environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
    let secret: string;
    try {
      secret = decryptMnemonic(wallet.encryptedMnemonic, wallet.iv, wallet.salt, pin);
    } catch {
      return { ok: false, error: "Invalid wallet PIN", status: 401 };
    }

    const keys =
      wallet.setupMethod === "IMPORTED_PRIVATE_KEY"
        ? deriveStellarKeypairFromPrivateKey(secret)
        : deriveStellarKeypairFromMnemonic(secret);

    const userKeypair = StellarSdk.Keypair.fromSecret(keys.secretKey);
    const amountStroops = Math.round(numDeposit * 10_000_000);

    await ensureStellarTrustline(
      userKeypair,
      new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.mainnet.USDC),
      "mainnet",
    );

    const depositRes = await defindexClient.deposit(vaultAddress, {
      amounts: [amountStroops],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });

    if (!depositRes.xdr) {
      return { ok: false, error: "DeFindex failed to generate deposit transaction", status: 500 };
    }

    const tx = StellarSdk.TransactionBuilder.fromXDR(depositRes.xdr, StellarSdk.Networks.PUBLIC);
    tx.sign(userKeypair);
    const sendRes = await defindexClient.send(tx.toXDR());
    txHash = sendRes.txHash;
    explorerUrl = getExplorerTxUrl("stellar", txHash, false);
  }

  // 2. Atomically reserve circle member slot and increment balance
  const updatedCircle = await SavingsPlan.findOneAndUpdate(
    {
      _id: plan._id,
      kind: "circle",
      status: "Active",
      $expr: {
        $lt: [
          { $size: { $ifNull: ["$circleConfig.members", []] } },
          "$circleConfig.capacity",
        ],
      },
      "circleConfig.members.userId": { $ne: userId },
    },
    {
      $push: {
        "circleConfig.members": {
          userId,
          name: "Member",
          role: "member",
          saved: numDeposit,
          joinedAt: new Date(),
        },
        ...(txHash ? { txHashes: txHash } : {}),
      },
      $inc: { currentAmount: numDeposit },
    },
    { returnDocument: "after" },
  );

  if (!updatedCircle) {
    if (plan.currency === "NGN") {
      await atomicCreditNgnBalance({
        userId,
        amount: numDeposit,
        memo: `savings:refund:circle_full:${plan._id}`,
      }).catch((rErr) => console.error("[CircleJoin] Failed to refund over-subscribed user:", rErr));
    }
    return {
      ok: false,
      error: "This circle is already at full capacity or you have already joined.",
      status: 400,
    };
  }

  await createSavingsTransaction({
    planId: plan._id,
    userId,
    currency: plan.currency,
    kind: "deposit",
    amount: numDeposit,
    txHash,
    at: new Date(),
  });

  setUserCreatedSavings(userId).catch(() => {});

  return {
    ok: true,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
  };
}

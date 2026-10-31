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
} from "@/lib/functions/aellaFunctions";
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
  ensureSufficientStellarGas,
  getStellarFeeAmount,
  collectStellarGasFeeUsdc,
  disburseStellarUsdcFromTreasury,
} from "@/lib/chains/stellar";
import { fetchStellarBalances } from "@/lib/chains/stellar/account";
import { DefindexClient } from "@/lib/chains/stellar/defindex-client";
import { environment } from "@/lib/environment";
import { getExplorerTxUrl, CONTRACT_ADDRESSES } from "@/lib/blockchain";
import { apyForDays } from "@/lib/savings";
import { generateCircleInviteCode, generateId } from "@/lib/schema-ids";
import { formatPlanForUI } from "@/lib/savings-service";
import { NgnAccount } from "@/models/NgnAccount";
import { SavingsPlan } from "@/models/SavingsPlan";
import { connectDB, mongoose } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

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

    // Compute and lock APY for this plan at creation time
    const lockedApy = apyForDays(kind, days);
    await connectDB();
    const session = await mongoose.startSession();
    let plan: any;
    try {
      await session.withTransaction(async () => {
        if (numDeposit > 0) {
          await atomicDebitNgnBalance({
            userId,
            amount: numDeposit,
            memo: `savings:deposit:initial:${name}`,
            session,
          });
        }
        plan = await createSavingsPlanRecord({
          userId, walletId: wallet._id, walletAddress: stellarAddress, kind, name,
          category, targetAmount: Number(targetAmount) || 0, initialDeposit: numDeposit,
          currentAmount: numDeposit, interestEarned: 0, apy: lockedApy, currency: "NGN",
          chain: "none", vaultAddress: "ngn_db_vault", sharesOwned: "0", circleConfig,
          startDate, endDate, term: computedTerm, frequency, fundingSource: "ngn",
          status: "Active", penaltyFeePercent: 0, txHashes: [],
        }, session);
        if (numDeposit > 0) {
          await createSavingsTransaction({
            planId: plan._id, userId, currency: "NGN", kind: "deposit", amount: numDeposit, at: startDate,
          }, session);
          await Transaction.create([{
            userId, walletId: wallet._id, type: "SAVINGS_DEPOSIT", status: "CONFIRMED",
            chain: "fiat", network: "mainnet", fromAddress: "ngn_account", toAddress: "savings_plan",
            amount: String(numDeposit), token: "NGN", memo: `savings:create:${plan._id}`,
            savingsDetails: { planId: plan._id, vaultAddress: "ngn_db_vault" }, executedAt: new Date(),
          }], { session });
        }
      });
    } catch (err: any) {
      return { ok: false, error: err.message?.includes("Insufficient") ? `Insufficient NGN balance for this deposit (₦${numDeposit.toLocaleString()}).` : "Unable to create savings plan", status: 400 };
    } finally {
      await session.endSession();
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
    const nativeXlm = Number(balances.mainnet.xlm) || 0;
    const needsGasAbstraction = nativeXlm < 2.0;
    const gasFeeUsdc = needsGasAbstraction ? getStellarFeeAmount() : 0;
    const totalRequiredUsdc = numDeposit + gasFeeUsdc;

    // Strict Pre-condition: Check total USDC before ANY wallet activation or sponsorship
    if (availableUsdc < totalRequiredUsdc) {
      const errorMsg = needsGasAbstraction
        ? `Insufficient USDC balance: you have $${availableUsdc.toFixed(2)} USDC, but this deposit requires $${numDeposit.toFixed(2)} USDC plus $${gasFeeUsdc.toFixed(2)} USDC network fee.`
        : `Insufficient balance: you have $${availableUsdc.toFixed(2)} USDC and this deposit needs $${numDeposit.toFixed(2)}.`;
      return {
        ok: false,
        error: errorMsg,
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

    // All pre-conditions passed: sponsor gas if needed
    if (needsGasAbstraction) {
      const gasRes = await ensureSufficientStellarGas(stellarAddress, 2.0, 2.5, "mainnet");
      if (gasRes.sponsored && gasFeeUsdc > 0) {
        await collectStellarGasFeeUsdc({
          userKeypair,
          amountUsdc: gasFeeUsdc,
          network: "mainnet",
        }).catch((feeErr) => {
          console.warn("[Savings] Fee collection notice:", feeErr?.message || feeErr);
        });
      }
    }

    try {
      const depositRes = await defindexClient.deposit(vaultAddress, {
        amounts: [amountStroops],
        caller: stellarAddress,
        invest: true,
        slippageBps: 50,
      });

      if (!depositRes?.xdr) {
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
    } catch (onChainErr: any) {
      console.error(
        `Error: ${formatOneLineError(onChainErr?.rawDetail || onChainErr)}`,
      );
      return {
        ok: false,
        error: "Unable to complete on-chain savings deposit. Please verify your balance and try again.",
        status: 400,
      };
    }

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

    await connectDB();
    const session = await mongoose.startSession();
    let updatedPlan: any;
    try {
      await session.withTransaction(async () => {
        await atomicDebitNgnBalance({ userId, amount, memo: `savings:deposit:topup:${plan._id}`, session });
        updatedPlan = await SavingsPlan.findOneAndUpdate(
          { _id: plan._id, status: "Active", currentAmount: { $gte: 0 } },
          { $inc: { currentAmount: amount } },
          { returnDocument: "after", session },
        );
        if (!updatedPlan) throw new Error("Savings plan is no longer active");
        await createSavingsTransaction({ planId: plan._id, userId, currency: "NGN", kind: "top_up", amount, at: new Date() }, session);
        await Transaction.create([{
          userId, walletId: wallet._id, type: "SAVINGS_DEPOSIT", status: "CONFIRMED",
          chain: "fiat", network: "mainnet", fromAddress: "ngn_account", toAddress: "savings_plan",
          amount: String(amount), token: "NGN", memo: `savings:topup:${plan._id}`,
          savingsDetails: { planId: plan._id, vaultAddress: "ngn_db_vault" }, executedAt: new Date(),
        }], { session });
      });
    } catch (err: any) {
      return { ok: false, error: err.message || `Insufficient NGN balance for this top-up (₦${amount.toLocaleString()}).`, status: 400 };
    } finally {
      await session.endSession();
    }

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
  const nativeXlm = Number(balances.mainnet.xlm) || 0;
  const needsGasAbstraction = nativeXlm < 2.0;
  const gasFeeUsdc = needsGasAbstraction ? getStellarFeeAmount() : 0;
  const totalRequiredUsdc = amount + gasFeeUsdc;

  // Strict Pre-condition: Check total USDC before ANY wallet activation or sponsorship
  if (availableUsdc < totalRequiredUsdc) {
    const errorMsg = needsGasAbstraction
      ? `Insufficient USDC balance: you have $${availableUsdc.toFixed(2)} USDC, but this top-up requires $${amount.toFixed(2)} USDC plus $${gasFeeUsdc.toFixed(2)} USDC network fee.`
      : `Insufficient balance: you have $${availableUsdc.toFixed(2)} USDC and this top-up needs $${amount.toFixed(2)}.`;
    return {
      ok: false,
      error: errorMsg,
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

  // All pre-conditions passed: sponsor gas if needed
  if (needsGasAbstraction) {
    const gasRes = await ensureSufficientStellarGas(stellarAddress, 2.0, 2.5, "mainnet");
    if (gasRes.sponsored && gasFeeUsdc > 0) {
      await collectStellarGasFeeUsdc({
        userKeypair,
        amountUsdc: gasFeeUsdc,
        network: "mainnet",
      }).catch((feeErr) => {
        console.warn("[Savings Gas Abstraction] Fee collection notice:", feeErr?.message || feeErr);
      });
    }
  }

  const targetVault = environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
  let txHash: string | undefined;
  let explorerUrl: string | undefined;
  const topUpTransactionId = generateId("wdref");
  await Transaction.create({
    _id: topUpTransactionId,
    userId,
    walletId: wallet._id,
    type: "SAVINGS_DEPOSIT",
    status: "PENDING",
    chain: "stellar",
    network: "mainnet",
    fromAddress: stellarAddress,
    toAddress: targetVault,
    amount: String(amount),
    token: "USDC",
    memo: `savings:topup:${plan._id}`,
    savingsDetails: { planId: plan._id, vaultAddress: targetVault },
  });

  try {
    const depositRes = await defindexClient.deposit(targetVault, {
      amounts: [amountStroops],
      caller: stellarAddress,
      invest: true,
      slippageBps: 50,
    });

    if (!depositRes?.xdr) {
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
    txHash = sendRes.txHash;
    explorerUrl = getExplorerTxUrl("stellar", txHash, false);
    await Transaction.findByIdAndUpdate(topUpTransactionId, {
      status: "CONFIRMED", txHash, explorerUrl, executedAt: new Date(),
    });
  } catch (onChainErr: any) {
    console.error(
      `Error: ${formatOneLineError(onChainErr?.rawDetail || onChainErr)}`,
    );
    await Transaction.findByIdAndUpdate(topUpTransactionId, {
      status: "PENDING", errorMessage: formatOneLineError(onChainErr?.rawDetail || onChainErr),
    });
    return {
      ok: false,
      error: "Unable to complete on-chain savings top-up. Please verify your balance and try again.",
      status: 400,
    };
  }

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
  const isSaveTogetherCircle =
    plan.kind === "circle" && plan.circleConfig?.type === "save_together";
  const circleMember = isSaveTogetherCircle
    ? plan.circleConfig?.members.find((member) => member.userId === userId)
    : undefined;
  const memberPrincipal = circleMember?.saved || 0;
  const availablePrincipal = isSaveTogetherCircle
    ? memberPrincipal
    : plan.currentAmount;
  const principalWithdraw =
    amount !== undefined ? amount : availablePrincipal;

  if (principalWithdraw > availablePrincipal) {
    return {
      ok: false,
      error: `Requested amount exceeds your available share (${availablePrincipal})`,
      status: 400,
    };
  }

  // Net payout = principal + (interest unless forfeited)
  const interestShare = isSaveTogetherCircle && plan.currentAmount > 0
    ? (accruedInterest * memberPrincipal) / plan.currentAmount
    : accruedInterest;
  const interestPayout =
    forfeitInterest || (isSaveTogetherCircle && principalWithdraw < memberPrincipal)
      ? 0
      : interestShare;
  const netPayout = Number((principalWithdraw + interestPayout).toFixed(2));

  let txHash: string | undefined;
  let explorerUrl: string | undefined;

  const remainingBalance = Math.max(0, (plan.currentAmount || 0) - principalWithdraw);
  const isFullWithdrawal =
    isLock || (!isSaveTogetherCircle && remainingBalance === 0);

  // ── Currency: NGN (Database Ledger)
  if (plan.currency === "NGN") {
    // ATOMIC CLAIM: Deduct from SavingsPlan FIRST using atomic Compare-And-Swap (CAS)
    // WiredTiger engine locks this document during the write.
    // If concurrent requests hit, only 1 satisfies `currentAmount >= principalWithdraw`. The rest receive null.
    await connectDB();
    const session = await mongoose.startSession();
    let claimedPlan: any;
    try {
      await session.withTransaction(async () => {
    claimedPlan = await SavingsPlan.findOneAndUpdate(
      {
        _id: planId,
        $or: [{ userId }, { "circleConfig.members.userId": userId }],
        status: "Active",
        currentAmount: { $gte: principalWithdraw },
        ...(isSaveTogetherCircle
          ? {
              "circleConfig.members": {
                $elemMatch: {
                  userId,
                  saved: { $gte: principalWithdraw },
                },
              },
            }
          : {}),
      },
      {
        $inc: {
          currentAmount: -principalWithdraw,
          interestEarned: -interestPayout,
          ...(isSaveTogetherCircle
            ? { "circleConfig.members.$[member].saved": -principalWithdraw }
            : {}),
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
      {
        returnDocument: "after",
        session,
        ...(isSaveTogetherCircle
          ? { arrayFilters: [{ "member.userId": userId }] }
          : {}),
      },
    );

    if (!claimedPlan) {
      throw new Error("Insufficient balance or plan is already closed.");
    }

    // Atomically credit user's NgnAccount with the payout and invalidate balance cache
    try {
      await atomicCreditNgnBalance({
        userId,
        amount: netPayout,
        memo: `savings:withdraw:${plan._id}`,
        session,
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
    }, session);

    await Transaction.create([{
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
    }], { session });
      });
    } catch (creditErr: any) {
      console.error(`[Savings:Withdraw] NGN transaction rolled back: ${creditErr?.message || creditErr}`);
      return { ok: false, error: creditErr.message || "Unable to complete withdrawal", status: 503 };
    } finally {
      await session.endSession();
    }

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

  // Gas abstraction check for on-chain withdrawal
  const balances = await fetchStellarBalances(stellarAddress);
  const nativeXlm = Number(balances.mainnet.xlm) || 0;
  const needsGasAbstraction = nativeXlm < 2.0;
  const gasFeeUsdc = needsGasAbstraction ? getStellarFeeAmount() : 0;

  if (needsGasAbstraction) {
    const gasRes = await ensureSufficientStellarGas(stellarAddress, 2.0, 2.5, "mainnet");
    if (gasRes.sponsored && gasFeeUsdc > 0) {
      await collectStellarGasFeeUsdc({
        userKeypair,
        amountUsdc: gasFeeUsdc,
        network: "mainnet",
      }).catch((feeErr) => {
        console.warn("[Savings] Gas fee collection:", feeErr?.message || feeErr);
      });
    }
  }

  const withdrawalId = generateId("wdref");
  await connectDB();
  const withdrawalSession = await mongoose.startSession();
  let claimedUsdcPlan = plan;
  try {
    await withdrawalSession.withTransaction(async () => {
      const claimFilter: Record<string, unknown> = {
        _id: planId,
        status: "Active",
        currentAmount: { $gte: principalWithdraw },
      };
      if (isSaveTogetherCircle) {
        claimFilter["circleConfig.members"] = {
          $elemMatch: { userId, saved: { $gte: principalWithdraw } },
        };
      } else {
        claimFilter.$or = [{ userId }, { "circleConfig.members.userId": userId }];
      }

      const claimed = await SavingsPlan.findOneAndUpdate(
        claimFilter,
        {
          $inc: {
            currentAmount: -principalWithdraw,
            interestEarned: -interestPayout,
            ...(isSaveTogetherCircle
              ? { "circleConfig.members.$[member].saved": -principalWithdraw }
              : {}),
          },
        },
        {
          returnDocument: "after",
          session: withdrawalSession,
          ...(isSaveTogetherCircle
            ? { arrayFilters: [{ "member.userId": userId }] }
            : {}),
        },
      );
      if (!claimed) {
        throw new Error("Insufficient balance or withdrawal already claimed");
      }

      await Transaction.create(
        [
          {
            _id: withdrawalId,
            userId,
            walletId: wallet._id,
            type: "SAVINGS_WITHDRAW",
            status: "PENDING",
            chain: "stellar",
            network: "mainnet",
            fromAddress: targetVault,
            toAddress: stellarAddress,
            amount: String(netPayout),
            token: "USDC",
            memo: `savings:withdraw:${planId}`,
            savingsDetails: {
              planId,
              vaultAddress: targetVault,
              penaltyFee: forfeitInterest ? "interest forfeited" : undefined,
            },
          },
        ],
        { session: withdrawalSession },
      );
    });
  } catch (claimErr: unknown) {
    return {
      ok: false,
      error:
        claimErr instanceof Error
          ? claimErr.message
          : "Unable to reserve savings withdrawal",
      status: 409,
    };
  } finally {
    await withdrawalSession.endSession();
  }
  const updatedUsdcPlan = await getRawSavingsPlanById(planId, userId);
  if (!updatedUsdcPlan) {
    return {
      ok: false,
      error: "Savings plan could not be loaded after reservation",
      status: 500,
    };
  }
  claimedUsdcPlan = updatedUsdcPlan;
  let broadcastAttempted = false;
  let yieldTxHash: string | undefined;

  try {
    // Split Settlement: Withdraw user's principal from the on-chain DeFindex vault
    let liveUnderlyingStroops = 0;
    try {
      const balanceData = await defindexClient.getBalance(targetVault, stellarAddress);
      liveUnderlyingStroops = Number(balanceData.underlyingBalance?.[0] || 0);
    } catch (balErr) {
      console.warn("[withdrawSavingsExecution] Could not fetch live vault balance:", balErr);
    }

    const requestedPrincipalStroops = Math.round(principalWithdraw * 10_000_000);
    // If caller has a live on-chain position, clamp withdrawal amount to available shares/stroops
    const onChainWithdrawStroops = liveUnderlyingStroops > 0
      ? Math.min(requestedPrincipalStroops, liveUnderlyingStroops)
      : requestedPrincipalStroops;

    if (onChainWithdrawStroops > 0) {
      const withdrawRes = await defindexClient.withdraw(targetVault, {
        amounts: [onChainWithdrawStroops],
        caller: stellarAddress,
        slippageBps: 50, // 0.5% tolerance during strategy unwinding
      });

      if (!withdrawRes?.xdr) {
        throw new Error("Savings withdrawal did not return a transaction envelope");
      }
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        withdrawRes.xdr,
        StellarSdk.Networks.PUBLIC,
      );
      tx.sign(userKeypair);

      broadcastAttempted = true;
      const sendRes = await defindexClient.send(tx.toXDR());
      if (!sendRes?.txHash) {
        throw new Error("Savings withdrawal submission did not return a transaction hash");
      }
      txHash = sendRes.txHash;
      explorerUrl = getExplorerTxUrl("stellar", txHash, false);
      await Transaction.findByIdAndUpdate(withdrawalId, {
        status: "SUBMITTED",
        txHash,
      });
    }

    // Disburse off-chain accrued interest directly from Jumpa Treasury
    if (interestPayout > 0) {
      const yieldRes = await disburseStellarUsdcFromTreasury({
        destination: stellarAddress,
        amountUsdc: interestPayout,
        memo: `yield:${planId}`,
        network: "mainnet",
      });
      if (yieldRes.success) {
        yieldTxHash = yieldRes.txHash;
        console.log(
          `[withdrawSavingsExecution] Successfully disbursed $${interestPayout} USDC yield (tx: ${yieldTxHash})`,
        );
      } else {
        console.warn(
          `[withdrawSavingsExecution] Notice: Yield disbursal notice: ${yieldRes.error}. Principal was successfully withdrawn.`,
        );
      }
    }
  } catch (onChainErr: any) {
    console.error(
      `[withdrawSavingsExecution] Error: ${formatOneLineError(onChainErr?.rawDetail || onChainErr)}`,
    );

    // Rollback: If transaction was not successfully broadcasted on-chain, restore user's savings in DB
    if (!broadcastAttempted) {
      try {
        await SavingsPlan.findByIdAndUpdate(
          planId,
          {
            $inc: {
              currentAmount: principalWithdraw,
              interestEarned: interestPayout,
              ...(isSaveTogetherCircle
                ? { "circleConfig.members.$[member].saved": principalWithdraw }
                : {}),
            },
            $set: { status: "Active" },
          },
          {
            ...(isSaveTogetherCircle
              ? { arrayFilters: [{ "member.userId": userId }] }
              : {}),
          },
        );
      } catch (rollbackErr) {
        console.error(
          "[withdrawSavingsExecution] CRITICAL: Failed to rollback savings plan:",
          rollbackErr,
        );
      }
    }

    await Transaction.findByIdAndUpdate(withdrawalId, {
      status: broadcastAttempted ? "PENDING" : "FAILED",
      errorMessage: formatOneLineError(onChainErr?.rawDetail || onChainErr),
      txHash: txHash || null,
    });
    return {
      ok: false,
      error: txHash
        ? "Withdrawal is pending confirmation. Please try again later."
        : "Unable to complete savings withdrawal.",
      status: 503,
    };
  }

  await Transaction.findByIdAndUpdate(withdrawalId, {
    status: "CONFIRMED",
    txHash,
    explorerUrl,
    executedAt: new Date(),
    ...(yieldTxHash ? { "savingsDetails.yieldTxHash": yieldTxHash } : {}),
  });

  if (isFullWithdrawal) {
    await closeSavingsPlanRecord(planId, userId, {
      paidOut: netPayout,
      forfeited: forfeitInterest,
    });
  } else {
    const plan = claimedUsdcPlan!;
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

  return {
    ok: true,
    withdrawnAmount: principalWithdraw,
    netPayout,
    forfeited: forfeitInterest,
    txHash,
    explorerUrl,
    plan: formatPlanForUI(claimedUsdcPlan!),
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
    const nativeXlm = Number(balances.mainnet.xlm) || 0;
    const needsGasAbstraction = nativeXlm < 2.0;
    const gasFeeUsdc = needsGasAbstraction ? getStellarFeeAmount() : 0;
    const totalRequiredUsdc = numDeposit + gasFeeUsdc;

    // Strict Pre-condition: Check total USDC before ANY wallet activation or sponsorship
    if (availableUsdc < totalRequiredUsdc) {
      const errorMsg = needsGasAbstraction
        ? `Insufficient USDC balance: you have $${availableUsdc.toFixed(2)} USDC, but joining this circle requires $${numDeposit.toFixed(2)} USDC plus $${gasFeeUsdc.toFixed(2)} USDC network fee.`
        : `Insufficient USDC balance: you have $${availableUsdc.toFixed(2)} and need $${numDeposit.toFixed(2)}.`;
      return {
        ok: false,
        error: errorMsg,
        status: 400,
      };
    }

    // Atomically reserve a spot in the circle BEFORE executing the on-chain deposit
    const reservedCircle = await SavingsPlan.findOneAndUpdate(
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
            saved: 0,
            joinedAt: new Date(),
          },
        },
      },
      { returnDocument: "after" },
    );

    if (!reservedCircle) {
      return {
        ok: false,
        error: "This circle is already at full capacity or you have already joined.",
        status: 400,
      };
    }

    const vaultAddress = plan.vaultAddress || environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;
    let secret: string;
    try {
      secret = decryptMnemonic(wallet.encryptedMnemonic, wallet.iv, wallet.salt, pin);
    } catch {
      await SavingsPlan.updateOne(
        { _id: plan._id },
        { $pull: { "circleConfig.members": { userId } } },
      ).catch(() => {});
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

    // All pre-conditions passed: sponsor gas if needed
    if (needsGasAbstraction) {
      const gasRes = await ensureSufficientStellarGas(stellarAddress, 2.0, 2.5, "mainnet");
      if (gasRes.sponsored && gasFeeUsdc > 0) {
        await collectStellarGasFeeUsdc({
          userKeypair,
          amountUsdc: gasFeeUsdc,
          network: "mainnet",
        }).catch((feeErr) => {
          console.warn("[Savings] Gas fee collection:", feeErr?.message || feeErr);
        });
      }
    }

    try {
      const depositRes = await defindexClient.deposit(vaultAddress, {
        amounts: [amountStroops],
        caller: stellarAddress,
        invest: true,
        slippageBps: 50,
      });

      if (!depositRes?.xdr) {
        throw new Error("DeFindex failed to generate deposit transaction");
      }

      const tx = StellarSdk.TransactionBuilder.fromXDR(depositRes.xdr, StellarSdk.Networks.PUBLIC);
      tx.sign(userKeypair);
      const sendRes = await defindexClient.send(tx.toXDR());
      txHash = sendRes.txHash;
      explorerUrl = getExplorerTxUrl("stellar", txHash, false);
    } catch (onChainErr: any) {
      console.error(
        `Error: ${formatOneLineError(onChainErr?.rawDetail || onChainErr)}`,
      );
      // Release the reserved slot since on-chain deposit failed
      await SavingsPlan.updateOne(
        { _id: plan._id },
        { $pull: { "circleConfig.members": { userId } } },
      ).catch((releaseErr) => {
        console.error("[CircleJoin] Failed to release reserved slot:", releaseErr);
      });
      return {
        ok: false,
        error: "Unable to complete on-chain deposit for circle. Please verify your balance and try again.",
        status: 400,
      };
    }
  }

  // 2. Finalize circle member slot and increment balance
  if (plan.currency === "NGN") {
    const circleSession = await mongoose.startSession();
    await circleSession.startTransaction();
    try {
      await atomicDebitNgnBalance({
        userId,
        amount: numDeposit,
        memo: `savings:deposit:join_circle:${plan._id}`,
        session: circleSession,
      });

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
          },
          $inc: { currentAmount: numDeposit },
        },
        { returnDocument: "after", session: circleSession },
      );

      if (!updatedCircle) {
        throw new Error("This circle is already at full capacity or you have already joined.");
      }

      await createSavingsTransaction({
        planId: plan._id,
        userId,
        currency: plan.currency,
        kind: "deposit",
        amount: numDeposit,
        txHash,
        at: new Date(),
      }, circleSession);

      await circleSession.commitTransaction();
    } catch (joinErr: any) {
      await circleSession.abortTransaction();
      await circleSession.endSession();
      return { ok: false, error: joinErr.message || "Unable to join circle", status: 400 };
    }
    await circleSession.endSession();
  } else {
    // USDC on-chain deposit succeeded: finalize the reserved slot
    await SavingsPlan.updateOne(
      { _id: plan._id, "circleConfig.members.userId": userId },
      {
        $inc: { currentAmount: numDeposit },
        $set: { "circleConfig.members.$.saved": numDeposit },
        ...(txHash ? { $push: { txHashes: txHash } } : {}),
      },
    );

    await createSavingsTransaction({
      planId: plan._id,
      userId,
      currency: "USDC",
      kind: "deposit",
      amount: numDeposit,
      txHash,
      at: new Date(),
    });
  }

  setUserCreatedSavings(userId).catch(() => {});

  const refreshedPlan = await SavingsPlan.findById(plan._id);

  return {
    ok: true,
    plan: formatPlanForUI(refreshedPlan || plan),
    txHash,
    explorerUrl,
  };
}

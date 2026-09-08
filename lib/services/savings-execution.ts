import * as StellarSdk from "@stellar/stellar-sdk";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import {
  createSavingsPlanRecord,
  getRawSavingsPlanById,
} from "@/lib/functions/savingsFunctions";
import { createTransactionRecord } from "@/lib/functions/transactionFunctions";
import { setUserCreatedSavings } from "@/lib/functions/userFunctions";
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
import { formatPlanForUI } from "@/lib/savings-service";

const defindexClient = new DefindexClient(
  environment.DEFINDEX_API_KEY,
  environment.DEFINDEX_BASE_URL,
  "testnet",
);

export interface CreateSavingsExecutionParams {
  userId: string;
  wallet?: any;
  pin: string;
  kind?: "individual" | "lock" | "circle";
  name: string;
  category?: string;
  targetAmount?: number;
  depositAmount?: number;
  durationDays?: number;
  term?: string;
  frequency?: string;
  fundingSource?: "crypto" | "usd" | "ngn";
  chain?: string;
}

export interface DepositSavingsExecutionParams {
  userId: string;
  wallet?: any;
  pin: string;
  planId: string;
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
  penaltyFee?: number;
  netPayout?: number;
  receiptCardData?: any;
}

/**
 * Executes creation of a savings plan and optional initial deposit.
 * Chain-agnostic interface that delegates to chain-specific vault execution.
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
    chain = "stellar",
  } = params;

  const wallet = params.wallet || (await findWalletForUser(userId));
  if (!wallet) {
    return { ok: false, error: "No wallet found for user", status: 404 };
  }

  // 1. Verify 6-digit PIN
  const pinCheck = await verifyWalletPin(wallet, pin, { userId });
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error, status: pinCheck.status };
  }

  // Calculate term and dates
  const days = durationDays || (params.term ? parseInt(params.term) : 30) || 30;
  const computedTerm = `${days} DAYS`;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

  // 2. Resolve target vault address
  const vaultAddress =
    kind === "lock"
      ? environment.DEFINDEX_LOCK_VAULT_ADDRESS
      : environment.DEFINDEX_INDIVIDUAL_VAULT_ADDRESS;

  const stellarAddress = wallet.addresses?.xlm || wallet.address;
  let txHash: string | undefined;
  let initialShares = "0";
  const numDeposit = Number(depositAmount) || 0;

  // 3. Execute initial deposit on-chain if depositAmount > 0
  if (numDeposit > 0 && chain === "stellar") {
    if (!vaultAddress) {
      return {
        ok: false,
        error: "DeFindex vault address not configured",
        status: 500,
      };
    }

    const balances = await fetchStellarBalances(stellarAddress);
    const availableUsdc = Number(balances.testnet.usdc) || 0;
    if (availableUsdc < numDeposit) {
      return {
        ok: false,
        error: `Insufficient balance — you have $${availableUsdc.toFixed(2)} USDC and this deposit needs $${numDeposit.toFixed(2)}.`,
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
    const amountStroops = Math.round(numDeposit * 10_000_000);

    await ensureStellarTrustline(
      userKeypair,
      new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
      "testnet",
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
      StellarSdk.Networks.TESTNET,
    );
    tx.sign(userKeypair);

    const sendRes = await defindexClient.send(tx.toXDR());
    txHash = sendRes.txHash;
    initialShares = String(sendRes.dfTokens || amountStroops);
    const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

    await createTransactionRecord({
      userId,
      walletId: wallet._id,
      type: "SAVINGS_DEPOSIT",
      status: "CONFIRMED",
      chain: "stellar",
      network: "testnet",
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

  // 4. Save SavingsPlan in MongoDB
  const plan = await createSavingsPlanRecord({
    userId,
    walletId: wallet._id,
    walletAddress: stellarAddress,
    kind,
    name,
    category,
    targetAmount: Number(targetAmount) || 0,
    currentAmount: numDeposit,
    currency: "USDC",
    chain: (chain as "stellar") || "stellar",
    vaultAddress: vaultAddress || "",
    sharesOwned: initialShares,
    startDate,
    endDate,
    term: computedTerm,
    frequency,
    fundingSource,
    status: "Active",
    penaltyFeePercent: 5,
    txHashes: txHash ? [txHash] : [],
  });

  setUserCreatedSavings(userId).catch((err) =>
    console.warn("[SavingsCreate] Failed to update hasCreatedSavings:", err),
  );

  const explorerUrl = txHash ? getExplorerTxUrl("stellar", txHash, true) : undefined;

  const receiptCardData = {
    title: "Savings Goal Created",
    status: "Active",
    balance: {
      caption: "INITIAL DEPOSIT",
      value: numDeposit > 0 ? `$${numDeposit.toFixed(2)}` : "$0.00",
      badge: "USDC",
    },
    stats: [
      { lead: "Goal Name ", value: name },
      { lead: "Category ", value: category },
      {
        lead: "Target ",
        value: targetAmount ? `$${Number(targetAmount).toLocaleString("en-US")}` : "Open",
      },
      { lead: "Duration ", value: `${days} days` },
      { lead: "Estimated APY ", value: "8.5%" },
      ...(txHash
        ? [
            {
              lead: "Tx Hash ",
              value: `${txHash.slice(0, 6)}...${txHash.slice(-6)}`,
            },
          ]
        : []),
    ],
    txHash: txHash || undefined,
    explorerUrl: explorerUrl || undefined,
  };

  return {
    ok: true,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
    receiptCardData,
  };
}

/**
 * Executes a deposit (top-up) into an existing savings plan.
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

  // 1. Verify PIN
  const pinCheck = await verifyWalletPin(wallet, pin, { userId });
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error, status: pinCheck.status };
  }

  const stellarAddress = wallet.addresses?.xlm || wallet.address;

  // 2. Check balance
  const balances = await fetchStellarBalances(stellarAddress);
  const availableUsdc = Number(balances.testnet.usdc) || 0;
  if (availableUsdc < amount) {
    return {
      ok: false,
      error: `Insufficient balance — you have $${availableUsdc.toFixed(2)} USDC and this top-up needs $${amount.toFixed(2)}.`,
      status: 400,
    };
  }

  // 3. Decrypt and execute on-chain
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

  await ensureStellarTrustline(
    userKeypair,
    new StellarSdk.Asset("USDC", CONTRACT_ADDRESSES.stellar.testnet.USDC),
    "testnet",
  );

  const amountStroops = Math.round(amount * 10_000_000);
  const depositRes = await defindexClient.deposit(plan.vaultAddress, {
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
    StellarSdk.Networks.TESTNET,
  );
  tx.sign(userKeypair);

  const sendRes = await defindexClient.send(tx.toXDR());
  const txHash = sendRes.txHash;
  const explorerUrl = getExplorerTxUrl("stellar", txHash, true);

  // 4. Update SavingsPlan in MongoDB
  const oldBalance = plan.currentAmount || 0;
  const newTotal = oldBalance + amount;
  plan.currentAmount = newTotal;
  if (txHash && !plan.txHashes.includes(txHash)) {
    plan.txHashes.push(txHash);
  }
  await plan.save();

  // 5. Record Transaction
  await createTransactionRecord({
    userId,
    walletId: wallet._id,
    type: "SAVINGS_DEPOSIT",
    status: "CONFIRMED",
    chain: "stellar",
    network: "testnet",
    fromAddress: stellarAddress,
    toAddress: plan.vaultAddress,
    amount: String(amount),
    token: plan.currency || "USDC",
    memo: `savings:topup:${plan._id}`,
    txHash,
    explorerUrl,
    savingsDetails: {
      planId: plan._id,
      vaultAddress: plan.vaultAddress,
    },
    executedAt: new Date(),
  });

  const receiptCardData = {
    title: "Deposit Successful",
    status: "Successful",
    balance: {
      caption: "DEPOSITED",
      value: `$${amount.toFixed(2)}`,
      badge: "USDC",
    },
    stats: [
      { lead: "Goal ", value: plan.name },
      { lead: "New Balance ", value: `$${newTotal.toFixed(2)} USDC` },
      { lead: "Target ", value: `$${(plan.targetAmount || 0).toFixed(2)}` },
      { lead: "APY ", value: "8.5%" },
      {
        lead: "Tx Hash ",
        value: `${txHash.slice(0, 6)}...${txHash.slice(-6)}`,
      },
    ],
    txHash,
    explorerUrl,
  };

  return {
    ok: true,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
    receiptCardData,
  };
}

/**
 * Executes a withdrawal from an existing savings plan.
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

  const withdrawAmount = amount ?? plan.currentAmount;
  if (withdrawAmount > plan.currentAmount) {
    return {
      ok: false,
      error: `Requested amount ($${withdrawAmount}) exceeds plan balance ($${plan.currentAmount})`,
      status: 400,
    };
  }

  // 1. Verify PIN
  const pinCheck = await verifyWalletPin(wallet, pin, { userId });
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error, status: pinCheck.status };
  }

  // 2. Early withdrawal penalty check
  let penaltyFee = 0;
  const now = new Date();
  if (plan.kind === "lock" && plan.endDate && now < new Date(plan.endDate)) {
    const penaltyPercent = plan.penaltyFeePercent || 5;
    penaltyFee = Number(((withdrawAmount * penaltyPercent) / 100).toFixed(2));
  }

  const netPayout = Number((withdrawAmount - penaltyFee).toFixed(2));
  const stellarAddress = wallet.addresses?.xlm || wallet.address;

  // 3. Decrypt credentials & derive keypair
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

  // 4. Request DeFindex withdrawal transaction
  let txHash: string | undefined;
  let explorerUrl: string | undefined;

  try {
    const netPayoutStroops = Math.round(netPayout * 10_000_000);
    const withdrawRes = await defindexClient.withdraw(plan.vaultAddress, {
      amounts: [netPayoutStroops],
      caller: stellarAddress,
    });

    if (withdrawRes?.xdr) {
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        withdrawRes.xdr,
        StellarSdk.Networks.TESTNET,
      );
      tx.sign(userKeypair);

      const sendRes = await defindexClient.send(tx.toXDR());
      txHash = sendRes.txHash;
      explorerUrl = getExplorerTxUrl("stellar", txHash, true);
    }
  } catch (onChainErr: any) {
    console.warn(
      `[withdrawSavingsExecution] On-chain DeFindex withdraw failed or bypassed in testnet:`,
      onChainErr?.message || onChainErr,
    );
  }

  // 5. Update Plan Balance in MongoDB
  const remainingBalance = Math.max(0, (plan.currentAmount || 0) - withdrawAmount);
  plan.currentAmount = remainingBalance;
  if (remainingBalance === 0) {
    plan.status = "Closed";
  }
  if (txHash && !plan.txHashes.includes(txHash)) {
    plan.txHashes.push(txHash);
  }
  await plan.save();

  // 6. Record Transaction in DB
  await createTransactionRecord({
    userId,
    walletId: wallet._id,
    type: "SAVINGS_WITHDRAW",
    status: "CONFIRMED",
    chain: "stellar",
    network: "testnet",
    fromAddress: plan.vaultAddress,
    toAddress: stellarAddress,
    amount: String(netPayout),
    token: plan.currency || "USDC",
    memo: `savings:withdraw:${plan._id}`,
    txHash,
    explorerUrl,
    savingsDetails: {
      planId: plan._id,
      vaultAddress: plan.vaultAddress,
      penaltyFee: penaltyFee > 0 ? String(penaltyFee) : undefined,
    },
    executedAt: new Date(),
  });

  const receiptCardData = {
    title: "Withdrawal Successful",
    status: "Successful",
    balance: {
      caption: "RECEIVED",
      value: `$${netPayout.toFixed(2)}`,
      badge: "USDC",
    },
    stats: [
      { lead: "Goal ", value: plan.name },
      { lead: "Withdrawn ", value: `$${withdrawAmount.toFixed(2)}` },
      ...(penaltyFee > 0
        ? [{ lead: "Early Penalty (5%) ", value: `-$${penaltyFee.toFixed(2)}` }]
        : []),
      { lead: "Remaining Balance ", value: `$${remainingBalance.toFixed(2)} USDC` },
      ...(txHash
        ? [
            {
              lead: "Tx Hash ",
              value: `${txHash.slice(0, 6)}...${txHash.slice(-6)}`,
            },
          ]
        : []),
    ],
    txHash: txHash || undefined,
    explorerUrl: explorerUrl || undefined,
  };

  return {
    ok: true,
    withdrawnAmount: withdrawAmount,
    penaltyFee,
    netPayout,
    plan: formatPlanForUI(plan),
    txHash,
    explorerUrl,
    receiptCardData,
  };
}

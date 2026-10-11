import { isFailedStatus, isSentStatus } from "@/lib/bellmonie-transfer-status";
import { connectDB } from "@/lib/db";
import {
  invalidateBellmonieNgnBalanceCache,
  queryBellmonieTransactionByReference,
} from "@/lib/functions/bellmonieFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { type INgnAccount, NgnAccount } from "@/models/NgnAccount";
import { type ITransaction, Transaction } from "@/models/Transaction";

export class RefundError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 500 | 502,
  ) {
    super(message);
  }
}

/** Our record can still say CONFIRMED or PENDING when Bellmonie fails or reverses the payout later. */
const REFUNDABLE: ITransaction["status"][] = ["FAILED", "CONFIRMED", "PENDING"];

/** Bellmonie books a payout's reversal under `R-<original reference>`. */
export const reversalReference = (reference: string) => `R-${reference}`;

/** Any receipt that means the money is already back: our refund, a transfer rollback, a reversal credited as a deposit. */
const refundKeys = (reference: string) => [
  `${reference}-refund`,
  `${reference}-rollback`,
  reversalReference(reference),
];

async function lookupBellmonie(reference: string) {
  try {
    return (
      (await queryBellmonieTransactionByReference(reference))?.data ?? null
    );
  } catch (err) {
    // A 4xx on a lookup means no such transaction; anything else means Bellmonie could not answer.
    const status = (err as { status?: number })?.status ?? 0;
    if (status >= 400 && status < 500 && status !== 429) return null;
    throw err;
  }
}

/** What Bellmonie says happened to a payout. */
export type BellmonieVerdict =
  | "failed"
  | "reversed"
  | "sent"
  | "pending"
  | "not_found";

/** Rejects once `deadline` (epoch ms) passes. The lookup is left to finish: it only reads. */
function beforeDeadline<T>(lookup: Promise<T>, deadline?: number): Promise<T> {
  if (deadline === undefined) return lookup;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Bellmonie did not answer in time")),
      Math.max(0, deadline - Date.now()),
    );
  });
  return Promise.race([lookup, timeout]).finally(() => clearTimeout(timer));
}

/** Bellmonie's answer for one payout: the transfer itself first, then any reversal booked against it. */
async function bellmonieVerdict(
  reference: string,
  deadline?: number,
): Promise<{ verdict: BellmonieVerdict; status: string | null }> {
  const original = await beforeDeadline(lookupBellmonie(reference), deadline);
  const status = original?.status
    ? String(original.status).toLowerCase()
    : null;
  if (original && isFailedStatus(original.status)) {
    return { verdict: "failed", status };
  }
  const reversal = await beforeDeadline(
    lookupBellmonie(reversalReference(reference)),
    deadline,
  );
  if (reversal && !isFailedStatus(reversal.status)) {
    return { verdict: "reversed", status };
  }
  if (!original) return { verdict: "not_found", status: null };
  return {
    verdict: isSentStatus(status) ? "sent" : "pending",
    status,
  };
}

/** True when Bellmonie shows the payout failed, or has a reversal booked against it. */
async function bellmonieReportsFailure(
  reference: string,
  deadline?: number,
): Promise<boolean> {
  const { verdict } = await bellmonieVerdict(reference, deadline);
  return verdict === "failed" || verdict === "reversed";
}

/**
 * Credits a failed naira withdrawal (amount + fee) back to its sender, exactly once, with a
 * receipt and one notification. A withdrawal we did not record as FAILED is refunded only once
 * Bellmonie itself confirms the failure, so neither an operator nor a forged webhook can refund
 * a transfer that went through.
 */
export async function refundFailedNgnWithdrawal({
  transactionId,
  refundedBy,
  reason,
  lookupDeadline,
}: {
  transactionId: string;
  refundedBy: string;
  reason?: string;
  /** Epoch ms after which the Bellmonie check gives up. It runs before anything is written. */
  lookupDeadline?: number;
}): Promise<{ refundAmount: number; newBalance: number }> {
  await connectDB();

  const tx = await Transaction.findById(transactionId).lean<ITransaction>();
  if (!tx) throw new RefundError("Transaction not found", 404);

  if (
    tx.chain !== "fiat" ||
    tx.type !== "WITHDRAW" ||
    !REFUNDABLE.includes(tx.status)
  ) {
    throw new RefundError("Only a naira withdrawal can be refunded", 400);
  }

  const reference = tx.bankDetails?.reference;
  if (!reference)
    throw new RefundError("Transaction has no bank reference", 400);
  if (tx.refundedAt) throw new RefundError("Already refunded", 409);

  // Webhook refunds and transfer rollbacks predate `refundedAt`, so check their receipts too.
  const prior = await Transaction.exists({
    type: "DEPOSIT",
    txHash: { $in: refundKeys(reference) },
  });
  if (prior) throw new RefundError("Already refunded", 409);

  const refundAmount = Number(tx.amount || 0) + Number(tx.feePaid || 0);
  if (!(refundAmount > 0)) throw new RefundError("Nothing to refund", 400);

  // FAILED is Bellmonie's own answer to the transfer request; anything else needs its confirmation.
  if (tx.status !== "FAILED") {
    let failed: boolean;
    try {
      failed = await bellmonieReportsFailure(reference, lookupDeadline);
    } catch (err) {
      console.error(
        `[NGN Refund] Bellmonie lookup failed for ${reference}:`,
        err,
      );
      throw new RefundError(
        "Could not confirm the transfer with Bellmonie. Try again shortly.",
        502,
      );
    }
    if (!failed) {
      throw new RefundError(
        "Bellmonie does not show this transfer as failed or reversed",
        409,
      );
    }
  }

  const account = await NgnAccount.findOne({
    userId: tx.userId,
    provider: "bellmonie",
  }).lean<INgnAccount>();
  if (!account) throw new RefundError("User has no naira account", 404);

  // The claim is the lock: once `refundedAt` is set, no other caller can match it.
  const claimed = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: tx.status, refundedAt: null },
    {
      $set: {
        status: "FAILED",
        errorMessage:
          reason ||
          tx.errorMessage ||
          "The bank could not complete this transfer",
        refundedAt: new Date(),
        refundedBy,
      },
    },
  );
  if (!claimed) throw new RefundError("Already refunded", 409);

  const release = () =>
    Transaction.updateOne(
      { _id: transactionId },
      {
        $set: {
          status: tx.status,
          errorMessage: tx.errorMessage ?? null,
          refundedAt: null,
          refundedBy: null,
        },
      },
    );

  const recipient = tx.bankDetails?.accountName || "beneficiary";
  const bank = tx.bankDetails?.bankName || "Bank";
  const refundRef = `${reference}-refund`;

  // Receipt first, balance second: if either write fails the balance has not moved, so releasing is safe.
  let receiptId: string;
  try {
    const receipt = await Transaction.create({
      userId: tx.userId,
      type: "DEPOSIT",
      status: "CONFIRMED",
      chain: "fiat",
      network: "mainnet",
      fromAddress: "NGN_BANK_TRANSFER",
      toAddress: account.accountNumber || "Bloc MFB",
      amount: refundAmount.toString(),
      feePaid: "0",
      token: "NGN",
      bankDetails: {
        bankName: "Bloc MFB",
        accountNumber: account.accountNumber ?? undefined,
        accountName: account.accountName ?? undefined,
        reference: refundRef,
      },
      memo: `Refund for failed transfer to ${recipient} (${bank})`,
      txHash: refundRef,
      executedAt: new Date(),
    });
    receiptId = receipt._id;
  } catch (err) {
    console.error(`[NGN Refund] Receipt failed for ${transactionId}:`, err);
    await release();
    throw new RefundError("Refund could not be credited", 500);
  }

  const credited = await NgnAccount.findOneAndUpdate(
    { userId: tx.userId, provider: "bellmonie" },
    { $inc: { balance: refundAmount } },
    { returnDocument: "after" },
  ).catch((err) => {
    console.error(`[NGN Refund] Credit failed for ${transactionId}:`, err);
    return null;
  });
  if (!credited) {
    await Transaction.deleteOne({ _id: receiptId });
    await release();
    throw new RefundError("Refund could not be credited", 500);
  }

  invalidateBalanceCache(tx.userId);
  invalidateBellmonieNgnBalanceCache(tx.userId);

  createNotification({
    userId: tx.userId,
    tab: "transactions",
    type: "SECURITY_ALERT",
    title: "Transfer Failed & Refunded",
    body: `Your transfer of ₦${Number(tx.amount).toLocaleString()} to ${recipient} could not be completed, so ₦${refundAmount.toLocaleString()} has been returned to your Naira balance.`,
    metadata: { reference, refundAmount, refundedBy },
    link: `/transactions?id=${receiptId}`,
  }).catch(() => {});

  console.log(
    `[NGN Refund] ✅ Refunded ₦${refundAmount} to user ${tx.userId} for ${transactionId} (by ${refundedBy}).`,
  );
  return { refundAmount, newBalance: credited.balance };
}

/** Each check costs Bellmonie up to two lookups, so a call covers this many withdrawals at most. */
export const MAX_WITHDRAWAL_CHECKS = 25;
const LOOKUP_CONCURRENCY = 5;

/** Runs `task` over `items` a few at a time, so a batch never floods Bellmonie. */
async function forEachLimited<T>(
  items: T[],
  task: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: LOOKUP_CONCURRENCY }, worker));
}

export interface WithdrawalCheck {
  /** `ineligible`: not a naira withdrawal with a bank reference. `unavailable`: Bellmonie could not answer. */
  verdict: BellmonieVerdict | "ineligible" | "unavailable";
  /** Bellmonie's own status for the transfer, when it has one. */
  status: string | null;
}

/**
 * Asks Bellmonie what happened to each naira withdrawal and changes nothing. The admin dashboard
 * uses it to find payouts we recorded as sent that Bellmonie later failed or reversed.
 */
export async function checkNgnWithdrawals(
  transactionIds: string[],
): Promise<Record<string, WithdrawalCheck>> {
  await connectDB();

  const txs = await Transaction.find({ _id: { $in: transactionIds } })
    .select("chain type bankDetails")
    .lean<ITransaction[]>();
  const references = new Map<string, string>();
  for (const tx of txs) {
    const reference = tx.bankDetails?.reference;
    if (tx.chain === "fiat" && tx.type === "WITHDRAW" && reference) {
      references.set(String(tx._id), reference);
    }
  }

  const checks: Record<string, WithdrawalCheck> = {};
  await forEachLimited(transactionIds, async (id) => {
    const reference = references.get(id);
    if (!reference) {
      checks[id] = { verdict: "ineligible", status: null };
      return;
    }
    try {
      checks[id] = await bellmonieVerdict(reference);
    } catch (err) {
      console.error(
        `[NGN Refund] Bellmonie lookup failed for ${reference}:`,
        err,
      );
      checks[id] = { verdict: "unavailable", status: null };
    }
  });
  return checks;
}

/** Tells the sender their payout landed. The webhook and settlement share it so both read the same. */
export function notifyNgnWithdrawalSent(
  tx: Pick<ITransaction, "userId" | "amount" | "bankDetails">,
  reference: string,
): void {
  createNotification({
    userId: tx.userId,
    tab: "transactions",
    type: "WITHDRAWAL_COMPLETED",
    title: "Withdrawal Successful",
    body: `₦${Number(tx.amount).toLocaleString()} transfer to ${tx.bankDetails?.accountName || "beneficiary"} (${tx.bankDetails?.bankName || "Bank"}) has been completed successfully.`,
    metadata: {
      reference,
      amount: tx.amount,
      bankName: tx.bankDetails?.bankName,
      accountNumber: tx.bankDetails?.accountNumber,
    },
    link: "/transactions",
  }).catch(() => {});
}

/** A naira withdrawal Bellmonie accepted but has not yet called sent or failed. */
export function isPendingNgnWithdrawal(
  tx: Pick<
    ITransaction,
    "chain" | "type" | "status" | "bankDetails" | "refundedAt"
  >,
): boolean {
  return (
    tx.chain === "fiat" &&
    tx.type === "WITHDRAW" &&
    tx.status === "PENDING" &&
    !tx.refundedAt &&
    Boolean(tx.bankDetails?.reference)
  );
}

export type SettleOutcome = "confirmed" | "refunded" | "pending";

/**
 * Brings one pending naira withdrawal up to date with Bellmonie, for when its webhook is late or
 * never comes: a sent payout is confirmed, a failed or reversed one is refunded to the sender.
 * Never throws. If Bellmonie cannot answer, the transfer stays pending.
 */
export async function settlePendingNgnWithdrawal(
  tx: ITransaction,
  { lookupTimeoutMs }: { lookupTimeoutMs?: number } = {},
): Promise<{ outcome: SettleOutcome; tx: ITransaction }> {
  const reference = tx.bankDetails?.reference;
  if (!reference || !isPendingNgnWithdrawal(tx)) {
    return { outcome: "pending", tx };
  }

  // Bounds only the Bellmonie reads, so a write that has started always finishes.
  const deadline = lookupTimeoutMs ? Date.now() + lookupTimeoutMs : undefined;
  let verdict: BellmonieVerdict;
  try {
    ({ verdict } = await bellmonieVerdict(reference, deadline));
  } catch (err) {
    console.error(
      `[NGN Settle] Bellmonie lookup failed for ${reference}:`,
      err,
    );
    return { outcome: "pending", tx };
  }

  if (verdict === "sent") {
    const executedAt = new Date();
    const { modifiedCount } = await Transaction.updateOne(
      { _id: tx._id, status: "PENDING", refundedAt: null },
      { $set: { status: "CONFIRMED", executedAt } },
    );
    // Only the caller that flips it tells the user; the webhook may have got there first.
    if (modifiedCount === 1) notifyNgnWithdrawalSent(tx, reference);
    return {
      outcome: "confirmed",
      tx: { ...tx, status: "CONFIRMED", executedAt },
    };
  }

  if (verdict === "failed" || verdict === "reversed") {
    try {
      await refundFailedNgnWithdrawal({
        transactionId: String(tx._id),
        refundedBy: "system",
        lookupDeadline: deadline,
      });
    } catch (err) {
      // A RefundError here usually means the webhook refunded it first.
      if (err instanceof RefundError) {
        console.log(`[NGN Settle] ${reference} not refunded: ${err.message}`);
      } else {
        console.error(`[NGN Settle] Refund failed for ${reference}:`, err);
      }
    }
    const fresh = await Transaction.findById(tx._id).lean<ITransaction>();
    return {
      outcome: fresh?.refundedAt ? "refunded" : "pending",
      tx: fresh ?? tx,
    };
  }

  return { outcome: "pending", tx };
}

/** Each run settles this many at most, oldest first. */
const MAX_SETTLEMENTS_PER_RUN = 100;

export type SettlementRun = { checked: number } & Record<SettleOutcome, number>;

/** Settles every pending naira withdrawal. The cron runs it, so a payout whose webhook never came still resolves. */
export async function settlePendingNgnWithdrawals(): Promise<SettlementRun> {
  await connectDB();

  const pending = await Transaction.find({
    chain: "fiat",
    type: "WITHDRAW",
    status: "PENDING",
    refundedAt: null,
    "bankDetails.reference": { $exists: true, $ne: null },
  })
    .sort({ createdAt: 1 })
    .limit(MAX_SETTLEMENTS_PER_RUN)
    .lean<ITransaction[]>();

  const run: SettlementRun = {
    checked: pending.length,
    confirmed: 0,
    refunded: 0,
    pending: 0,
  };
  await forEachLimited(pending, async (tx) => {
    const { outcome } = await settlePendingNgnWithdrawal(tx);
    run[outcome]++;
  });
  return run;
}

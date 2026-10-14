import { connectDB } from "@/lib/db";
import {
  invalidateBellmonieNgnBalanceCache,
  queryBellmonieTransferStatus,
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
const FAILED_STATUSES = new Set(["failed", "reversed", "rejected", "declined"]);
const isFailedStatus = (status: unknown) =>
  FAILED_STATUSES.has(String(status ?? "").toLowerCase());

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
    const res = await queryBellmonieTransferStatus(reference);
    return res?.data ?? res ?? null;
  } catch (err: any) {
    const status = err?.status ?? 0;
    const msg = err?.data?.message || err?.message || "";
    const isNotFound =
      err?.isNotFound ||
      (status >= 400 && status < 500 && status !== 429) ||
      (status === 500 && (err?.data?.errorCode === "ERR-00" || /reading 'details'/i.test(msg)));

    if (isNotFound) return null;
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

const SENT_STATUSES = new Set(["successful", "success"]);

function extractStatus(record: any): string | null {
  if (!record) return null;
  const raw =
    record.status ??
    record.transactionStatus ??
    record.data?.status ??
    record.data?.transactionStatus;
  return raw ? String(raw).toLowerCase() : null;
}

/** Bellmonie's answer for one payout: the transfer itself first, then any reversal booked against it. */
async function bellmonieVerdict(
  reference: string,
): Promise<{ verdict: BellmonieVerdict; status: string | null }> {
  const original = await lookupBellmonie(reference);
  const status = extractStatus(original);
  if (original && isFailedStatus(status)) {
    return { verdict: "failed", status };
  }
  const reversal = await lookupBellmonie(reversalReference(reference));
  const reversalStatus = extractStatus(reversal);
  if (reversal && !isFailedStatus(reversalStatus)) {
    return { verdict: "reversed", status };
  }
  if (!original) return { verdict: "not_found", status: null };
  return {
    verdict: status && SENT_STATUSES.has(status) ? "sent" : "pending",
    status,
  };
}

/** True when Bellmonie shows the payout failed, or has a reversal booked against it. */
async function bellmonieReportsFailure(reference: string): Promise<boolean> {
  const { verdict } = await bellmonieVerdict(reference);
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
}: {
  transactionId: string;
  refundedBy: string;
  reason?: string;
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

  // Resolve reference with fallbacks (bankDetails.reference -> txHash)
  const reference = tx.bankDetails?.reference || tx.txHash;
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

  const isInternal =
    /bloc/i.test(tx.bankDetails?.bankName || "") ||
    /transfer to/i.test(tx.memo || "") ||
    /bloc/i.test(tx.toAddress || "");

  if (isInternal) {
    throw new RefundError(
      "Internal transfers cannot be refunded as they are executed immediately and atomically",
      400,
    );
  }

  // FAILED is Bellmonie's own answer to the transfer request; anything else needs its confirmation.
  if (tx.status !== "FAILED") {
    let failed: boolean;
    try {
      failed = await bellmonieReportsFailure(reference);
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
    $or: [{ provider: "bellmonie" }, { provider: { $exists: false } }],
  }).lean<INgnAccount>();
  if (!account) throw new RefundError("User has no naira account", 404);

  // The claim is the lock: once `refundedAt` is set, no other caller can match it.
  // Use $in: REFUNDABLE so that a concurrent status change doesn't break the lock.
  const claimed = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: { $in: REFUNDABLE }, refundedAt: null },
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
  const defaultBankName = account.bankName || "Bloc MFB";

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
      toAddress: account.accountNumber || defaultBankName,
      amount: refundAmount.toString(),
      feePaid: "0",
      token: "NGN",
      bankDetails: {
        bankName: defaultBankName,
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
    {
      userId: tx.userId,
      $or: [{ provider: "bellmonie" }, { provider: { $exists: false } }],
    },
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
  }).catch(() => { });

  console.log(
    `[NGN Refund] ✅ Refunded ₦${refundAmount} to user ${tx.userId} for ${transactionId} (by ${refundedBy}).`,
  );
  return { refundAmount, newBalance: credited.balance };
}

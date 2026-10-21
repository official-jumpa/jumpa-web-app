import { connectDB } from "@/lib/db";
import { Transaction, type ITransaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { getUserPreferences } from "@/lib/functions/userFunctions";
import {
  sendDepositConfirmedEmail,
  sendWithdrawalConfirmedEmail,
  sendWithdrawalFailedEmail,
  formatChainName,
  cleanTokenSymbol,
  getExplorerUrl,
} from "@/lib/email-notifications";

export type TransactionEmailEventType =
  | "DEPOSIT_CONFIRMED"
  | "WITHDRAWAL_CONFIRMED"
  | "WITHDRAWAL_FAILED";

/**
 * Centralized orchestrator that evaluates, dedupes, and dispatches
 * transactional emails strictly for Deposits and Withdrawals.
 *
 * Excludes: SWAP, BRIDGE, AIRTIME, DATA, FAUCET.
 */
export async function dispatchTransactionEmail(
  txOrId: string | ITransaction | any,
  eventType: TransactionEmailEventType,
): Promise<void> {
  try {
    await connectDB();

    // 1. Resolve Transaction Document
    let tx: ITransaction | null = null;
    if (typeof txOrId === "string") {
      tx = await Transaction.findById(txOrId).lean<ITransaction>();
    } else if (txOrId?._id) {
      tx = txOrId;
    }

    if (!tx || !tx.userId) {
      return;
    }

    // 2. Strict Type Exclusion Guard
    // Strictly ONLY Deposits and Withdrawals (including onramps & offramps)
    const isDeposit = tx.type === "DEPOSIT" || tx.type === "ONRAMP";
    const isWithdrawal =
      tx.type === "WITHDRAW" ||
      tx.type === "OFFRAMP" ||
      (tx.type === "TRANSFER" && eventType === "WITHDRAWAL_CONFIRMED");

    if (!isDeposit && !isWithdrawal) {
      // Swaps, Bridges, Airtime, Data, Faucet are strictly ignored
      return;
    }

    // Unfunded onramp failures are skipped to avoid user panic
    if (tx.type === "ONRAMP" && eventType === "WITHDRAWAL_FAILED") {
      return;
    }

    // 3. Concurrency & Deduplication Claim
    // Atomically claim dispatch so concurrent pollers / webhooks / crons do not send duplicate emails
    const claim = await Transaction.findOneAndUpdate(
      { _id: tx._id, emailSent: { $ne: true } },
      { $set: { emailSent: true, emailSentAt: new Date() } },
      { new: true },
    );

    if (!claim) {
      // Already sent by another concurrent handler
      return;
    }

    // 4. User Preference & Email Address Resolution
    const user = await User.findById(tx.userId)
      .select("email name nickname")
      .lean<{ email?: string; name?: string | null; nickname?: string | null }>();

    if (!user || !user.email) {
      await Transaction.updateOne(
        { _id: tx._id },
        { $set: { emailSent: false, emailSkippedReason: "NO_USER_EMAIL" } },
      ).catch(() => {});
      return;
    }

    const prefs = await getUserPreferences(tx.userId);
    const isAllowedByPref =
      prefs.emailNotifications !== false && prefs.transactionEmails !== false;

    if (!isAllowedByPref) {
      await Transaction.updateOne(
        { _id: tx._id },
        { $set: { emailSent: false, emailSkippedReason: "USER_PREFERENCE_DISABLED" } },
      ).catch(() => {});
      console.log(`[Transaction Email] Skipped for ${tx.userId} due to preference`);
      return;
    }

    const customerName = user.name || user.nickname || "there";
    const displayToken = cleanTokenSymbol(tx.token || (tx.chain === "fiat" ? "NGN" : "USDC"));

    // 5. Dispatch Event-Specific Email Template
    if (eventType === "DEPOSIT_CONFIRMED") {
      const isNgn = displayToken === "NGN" || tx.chain === "fiat";
      const amountStr = isNgn
        ? `₦${Number(tx.amount).toLocaleString()}`
        : `${Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;

      let channel = "Bank Deposit";
      if (tx.type === "ONRAMP") {
        channel = "Bank Transfer";
      } else if (tx.chain && tx.chain !== "fiat") {
        channel = `${formatChainName(tx.chain)} Network`;
      } else {
        channel = "Naira Account";
      }

      let senderInfo = tx.bankDetails?.senderName
        ? `${tx.bankDetails?.senderBank || "Bank"} • ${tx.bankDetails?.senderName}`
        : undefined;

      if (!senderInfo && tx.fromAddress && tx.fromAddress !== "unknown" && tx.fromAddress !== "USER_WALLET") {
        senderInfo = tx.fromAddress.length > 20
          ? `${tx.fromAddress.slice(0, 6)}...${tx.fromAddress.slice(-4)}`
          : tx.fromAddress;
      }

      let explorerUrl: string | undefined = tx.explorerUrl;
      if (!explorerUrl && tx.txHash && tx.chain && tx.chain !== "fiat") {
        explorerUrl = getExplorerUrl(displayToken, tx.txHash);
      }

      const fiatPaid = tx.rampDetails?.fiatAmount
        ? `₦${Number(tx.rampDetails.fiatAmount).toLocaleString()}`
        : undefined;

      await sendDepositConfirmedEmail(user.email, {
        customerName,
        amount: amountStr,
        currencyOrToken: isNgn ? "" : displayToken,
        channel,
        senderInfo,
        transactionId: tx._id,
        reference: tx.txHash || tx._id,
        explorerUrl,
        fiatPaid,
        date: tx.executedAt || tx.createdAt || new Date(),
      });
    } else if (eventType === "WITHDRAWAL_CONFIRMED") {
      const isNgn = displayToken === "NGN" || tx.chain === "fiat";
      const amountStr = isNgn
        ? `₦${Number(tx.amount).toLocaleString()}`
        : `${Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;

      let channel = "Bank Transfer";
      if (tx.chain && tx.chain !== "fiat") {
        channel = `${formatChainName(tx.chain)} Network`;
      } else {
        channel = "Bank Transfer";
      }

      // Destination Info: Bank Name + Account Number + Name or Wallet address
      const bankName =
        tx.bankDetails?.bankName ||
        tx.rampDetails?.bankDetails?.bankName ||
        (tx.toAddress?.includes("/") ? tx.toAddress.split("/")[0].trim() : "");
      const accountNumber =
        tx.bankDetails?.accountNumber ||
        tx.rampDetails?.bankDetails?.accountNumber ||
        (tx.toAddress?.includes("/") ? tx.toAddress.split("/")[1].trim() : "");
      const accountName =
        tx.bankDetails?.accountName ||
        tx.rampDetails?.bankDetails?.accountName ||
        "";

      let destinationInfo = "";
      if (bankName || accountNumber) {
        destinationInfo = `${bankName || "Bank"} • ${accountNumber || ""}${accountName ? ` (${accountName})` : ""}`;
      } else if (tx.toAddress) {
        destinationInfo = tx.toAddress.length > 20
          ? `${tx.toAddress.slice(0, 6)}...${tx.toAddress.slice(-4)}`
          : tx.toAddress;
      } else {
        destinationInfo = "Destination Account";
      }

      const fiatReceived = tx.rampDetails?.fiatAmount
        ? `₦${Number(tx.rampDetails.fiatAmount).toLocaleString()}`
        : undefined;

      let explorerUrl: string | undefined = tx.explorerUrl;
      if (!explorerUrl && tx.txHash && tx.chain && tx.chain !== "fiat") {
        explorerUrl = getExplorerUrl(displayToken, tx.txHash);
      }

      await sendWithdrawalConfirmedEmail(user.email, {
        customerName,
        amount: amountStr,
        currencyOrToken: isNgn ? "" : displayToken,
        channel,
        destinationInfo,
        transactionId: tx._id,
        reference: tx.txHash || tx._id,
        explorerUrl,
        fiatReceived,
        date: tx.executedAt || tx.createdAt || new Date(),
      });
    } else if (eventType === "WITHDRAWAL_FAILED") {
      const isNgn = displayToken === "NGN" || tx.chain === "fiat";
      const amountStr = isNgn
        ? `₦${Number(tx.amount).toLocaleString()}`
        : `${Number(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;

      let channel = "Bank Transfer";
      if (tx.chain && tx.chain !== "fiat") {
        channel = `${formatChainName(tx.chain)} Network`;
      } else {
        channel = "Bank Transfer";
      }

      const bankName =
        tx.bankDetails?.bankName ||
        tx.rampDetails?.bankDetails?.bankName ||
        (tx.toAddress?.includes("/") ? tx.toAddress.split("/")[0].trim() : "");
      const accountNumber =
        tx.bankDetails?.accountNumber ||
        tx.rampDetails?.bankDetails?.accountNumber ||
        (tx.toAddress?.includes("/") ? tx.toAddress.split("/")[1].trim() : "");
      const accountName =
        tx.bankDetails?.accountName ||
        tx.rampDetails?.bankDetails?.accountName ||
        "";

      let destinationInfo = "";
      if (bankName || accountNumber) {
        destinationInfo = `${bankName || "Bank"} • ${accountNumber || ""}${accountName ? ` (${accountName})` : ""}`;
      } else if (tx.toAddress) {
        destinationInfo = tx.toAddress.length > 20
          ? `${tx.toAddress.slice(0, 6)}...${tx.toAddress.slice(-4)}`
          : tx.toAddress;
      } else {
        destinationInfo = "Destination Account";
      }

      const reason = tx.errorMessage || "Transfer declined by destination bank";
      const refundStatus = tx.refundedAt
        ? "Your debited funds have been refunded to your Naira wallet."
        : "Your funds are safe and will be refunded to your balance automatically.";

      await sendWithdrawalFailedEmail(user.email, {
        customerName,
        amount: amountStr,
        currencyOrToken: isNgn ? "" : displayToken,
        channel,
        destinationInfo,
        reason,
        refundStatus,
        transactionId: tx._id,
        reference: tx.txHash || tx._id,
        date: tx.updatedAt || new Date(),
      });
    }
  } catch (err: any) {
    console.error("[Transaction Email] Error:", err);
  }
}

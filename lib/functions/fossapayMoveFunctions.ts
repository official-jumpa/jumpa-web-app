import { connectDB, mongoose } from "@/lib/db";
import { getFossapayWallet } from "@/lib/functions/fossapayFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { type INgnAccount, NgnAccount } from "@/models/NgnAccount";
import { Transaction } from "@/models/Transaction";

export type FossapayMoveOutcome =
  | "moved"
  | "would_move"
  | "no_aella_account"
  | "fossapay_holds_less"
  | "failed";

export interface FossapayMoveRow {
  userId: string;
  accountName: string;
  fossapayAccountId: string;
  amount: number;
  /** What FossaPay itself reports for the wallet; null when it can't be read. */
  liveBalance: number | null;
  outcome: FossapayMoveOutcome;
  reference?: string;
  error?: string;
}

/** One move per legacy account ever: a second attempt collides on txHash and changes nothing. */
export function fossapayMoveReference(fossapayAccountId: string): string {
  return `FOSSAPAY-MOVE-${fossapayAccountId}`;
}

async function readLiveBalance(account: INgnAccount): Promise<number | null> {
  if (!account.providerAccountId) return null;
  try {
    const wallet = await getFossapayWallet(account.providerAccountId);
    return typeof wallet?.availableBalance === "number"
      ? wallet.availableBalance
      : null;
  } catch {
    return null;
  }
}

/**
 * Moves Naira left on retired FossaPay accounts onto the same user's Aella account, the only one that can withdraw.
 * Only the ledger moves; the cash stays in Jumpa's FossaPay wallets. Without `apply` it only reports.
 */
export async function moveFossapayBalances(options: {
  apply: boolean;
  userId?: string;
}): Promise<FossapayMoveRow[]> {
  await connectDB();

  const legacy = await NgnAccount.find({
    provider: "fossapay",
    balance: { $gt: 0 },
    ...(options.userId ? { userId: options.userId } : {}),
  })
    .sort({ balance: -1 })
    .lean<INgnAccount[]>();

  const rows: FossapayMoveRow[] = [];

  for (const account of legacy) {
    const amount = account.balance;
    const row: FossapayMoveRow = {
      userId: account.userId,
      accountName: account.accountName || "",
      fossapayAccountId: String(account._id),
      amount,
      liveBalance: await readLiveBalance(account),
      outcome: "would_move",
    };
    rows.push(row);

    const aella = await NgnAccount.findOne({
      userId: account.userId,
      provider: "aella",
      status: "active",
    }).lean<INgnAccount>();
    if (!aella?.accountNumber) {
      row.outcome = "no_aella_account";
      continue;
    }
    const aellaAccountNumber = aella.accountNumber;

    // A wallet holding less than the ledger needs a person to look before anything moves
    if (row.liveBalance !== null && row.liveBalance < amount) {
      row.outcome = "fossapay_holds_less";
      continue;
    }

    if (!options.apply) continue;

    const reference = fossapayMoveReference(String(account._id));
    row.reference = reference;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const emptied = await NgnAccount.updateOne(
          { _id: account._id, provider: "fossapay", balance: amount },
          {
            $set: {
              balance: 0,
              "providerMetadata.movedToAella": {
                amount,
                aellaAccountId: String(aella._id),
                reference,
                movedAt: new Date(),
              },
            },
          },
          { session },
        );
        if (emptied.modifiedCount !== 1) {
          throw new Error("FossaPay balance changed since it was read");
        }

        const credited = await NgnAccount.updateOne(
          { _id: aella._id, provider: "aella", status: "active" },
          { $inc: { balance: amount } },
          { session },
        );
        if (credited.modifiedCount !== 1) {
          throw new Error("Aella account could not be credited");
        }

        await Transaction.create(
          [
            {
              userId: account.userId,
              type: "DEPOSIT",
              status: "CONFIRMED",
              chain: "fiat",
              network: "mainnet",
              fromAddress: account.accountNumber || "FossaPay",
              toAddress: aellaAccountNumber,
              amount: amount.toString(),
              feePaid: "0",
              token: "NGN",
              bankDetails: {
                bankName: aella.bankName || "Aella MFB",
                accountNumber: aellaAccountNumber,
                accountName: aella.accountName || undefined,
                reference,
                senderName: account.accountName || undefined,
                senderAccountNumber: account.accountNumber || undefined,
                senderBank: account.bankName || undefined,
              },
              memo: "Moved from your old Naira account",
              txHash: reference,
              executedAt: new Date(),
            },
          ],
          { session },
        );
      });
      row.outcome = "moved";
    } catch (err) {
      row.outcome = "failed";
      row.error = formatOneLineError(err);
      continue;
    } finally {
      await session.endSession();
    }

    await invalidateBalanceCache(account.userId);
    createNotification({
      userId: account.userId,
      tab: "transactions",
      type: "DEPOSIT_COMPLETED",
      title: "Naira balance moved",
      body: `₦${amount.toLocaleString()} from your old Naira account is now in your current Naira account. You can withdraw it as usual.`,
      metadata: { amount, token: "NGN", txHash: reference },
      link: "/ngn-account",
    }).catch(() => {});
  }

  return rows;
}

import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";
import { SavingsPlan, type SavingsPlanStatus } from "@/models/SavingsPlan";
import { Transaction } from "@/models/Transaction";

/** What a user should clear before deleting their account. */
export interface AccountClosureChecks {
  /** Naira held for them. It is custodial, so it is lost with the account. */
  ngnBalance: number;
  pendingTransactions: number;
  activeSavings: number;
}

/** Money still in a plan counts until it has been paid out. */
const OPEN_PLAN: SavingsPlanStatus[] = ["Active", "Matured", "Paused"];

export async function getAccountClosureChecks(
  userId: string,
): Promise<AccountClosureChecks> {
  await connectDB();
  const [accounts, pendingTransactions, activeSavings] = await Promise.all([
    NgnAccount.find({ userId }).select("balance").lean(),
    Transaction.countDocuments({ userId, status: "PENDING" }),
    SavingsPlan.countDocuments({
      userId,
      status: { $in: OPEN_PLAN },
      currentAmount: { $gt: 0 },
    }),
  ]);

  const ngnBalance = accounts.reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0,
  );
  return { ngnBalance, pendingTransactions, activeSavings };
}

import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";

export interface FormattedNgnAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
}

export interface FormattedNgnBalance {
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
}

/**
 * Finds the active NGN account for a user, prioritizing FossaPay and falling back to any provider.
 */
export async function getUserNgnAccount(
  userId: string,
  provider = "fossapay",
): Promise<INgnAccount | null> {
  await connectDB();
  const account =
    (await NgnAccount.findOne({ userId, provider }).lean<INgnAccount>()) ||
    (await NgnAccount.findOne({ userId }).lean<INgnAccount>());
  return account;
}

/**
 * Retrieves the user's NGN account formatted for UI display, including bank details and ledger balance.
 */
export async function getUserNgnAccountDetails(
  userId: string,
  fallbackAccountName = "Jumpa User",
): Promise<{
  account: FormattedNgnAccountDetails | null;
  balance: FormattedNgnBalance | null;
}> {
  const accountDoc = await getUserNgnAccount(userId);

  if (!accountDoc) {
    return { account: null, balance: null };
  }

  const account: FormattedNgnAccountDetails = {
    bankName: accountDoc.bankName || "Sterling MFB",
    accountNumber: accountDoc.accountNumber || "",
    accountName: accountDoc.accountName || fallbackAccountName,
    status: accountDoc.status || "active",
  };

  const rawBal = Number(accountDoc.balance ?? 0);
  const balance: FormattedNgnBalance = {
    availableBalance: rawBal,
    ledgerBalance: rawBal,
    currency: accountDoc.currency || "NGN",
  };

  return { account, balance };
}

/**
 * Checks whether a user has an active NGN virtual account with an assigned account number.
 */
export async function hasActiveNgnAccount(userId: string): Promise<boolean> {
  const account = await getUserNgnAccount(userId);
  return Boolean(
    account &&
      account.accountNumber &&
      account.status === "active",
  );
}


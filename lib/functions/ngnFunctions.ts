import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";

export interface FormattedNgnAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  provider?: "bellmonie" | "fossapay" | string;
}

export interface FormattedNgnBalance {
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
}

/**
 * Finds an active NGN account for a user, prioritizing Bellmonie and falling back to FossaPay / any provider.
 */
export async function getUserNgnAccount(
  userId: string,
  preferredProvider?: string,
): Promise<INgnAccount | null> {
  await connectDB();
  if (preferredProvider) {
    const specific = await NgnAccount.findOne({ userId, provider: preferredProvider }).lean<INgnAccount>();
    if (specific) return specific;
  }

  // Prioritize Bellmonie, fallback to FossaPay, then any
  const bellmonieAcc = await NgnAccount.findOne({ userId, provider: "bellmonie" }).lean<INgnAccount>();
  if (bellmonieAcc) return bellmonieAcc;

  const fossapayAcc = await NgnAccount.findOne({ userId, provider: "fossapay" }).lean<INgnAccount>();
  if (fossapayAcc) return fossapayAcc;

  const anyAcc = await NgnAccount.findOne({ userId }).lean<INgnAccount>();
  return anyAcc;
}

/**
 * Retrieves all NGN accounts belonging to a user.
 */
export async function getAllUserNgnAccounts(userId: string): Promise<INgnAccount[]> {
  await connectDB();
  return NgnAccount.find({ userId, status: "active" }).lean<INgnAccount[]>();
}

/**
 * Retrieves the user's primary or requested NGN account formatted for UI display.
 */
export async function getUserNgnAccountDetails(
  userId: string,
  fallbackAccountName = "Jumpa User",
  options?: { force?: boolean; provider?: "bellmonie" | "fossapay" },
): Promise<{
  account: FormattedNgnAccountDetails | null;
  balance: FormattedNgnBalance | null;
  accounts?: FormattedNgnAccountDetails[];
  activeProvider?: string;
  canCreateBellmonie?: boolean;
}> {
  await connectDB();
  const allAccounts = await getAllUserNgnAccounts(userId);
  const hasBellmonie = allAccounts.some((a) => a.provider === "bellmonie");
  const hasFossapay = allAccounts.some((a) => a.provider === "fossapay");

  const requestedProvider = options?.provider || (hasBellmonie ? "bellmonie" : "fossapay");

  // Format all active accounts
  const formattedAccounts: FormattedNgnAccountDetails[] = allAccounts.map((a) => ({
    bankName: a.bankName || (a.provider === "bellmonie" ? "Bloc MFB" : "Sterling MFB"),
    accountNumber: a.accountNumber || "",
    accountName: a.accountName || fallbackAccountName,
    status: a.status || "active",
    provider: a.provider || "bellmonie",
  }));

  // Selected account
  const selectedDoc = options?.provider
    ? allAccounts.find((a) => a.provider === options.provider)
    : (allAccounts.find((a) => a.provider === requestedProvider) || allAccounts[0]);

  if (!selectedDoc) {
    return {
      account: null,
      balance: null,
      accounts: formattedAccounts,
      activeProvider: options?.provider || undefined,
      canCreateBellmonie: !hasBellmonie,
    };
  }

  // Live balance for FossaPay if requested
  if (selectedDoc.provider === "fossapay") {
    try {
      const { refreshUserNgnAccountBalance } = await import(
        "@/lib/functions/fossapayFunctions"
      );
      const refreshed = await refreshUserNgnAccountBalance(userId, { force: options?.force });
      if (refreshed.hasAccount && refreshed.account && refreshed.balance) {
        return {
          account: {
            ...refreshed.account,
            accountName: refreshed.account.accountName || fallbackAccountName,
            provider: "fossapay",
          },
          balance: refreshed.balance,
          accounts: formattedAccounts,
          activeProvider: "fossapay",
          canCreateBellmonie: !hasBellmonie,
        };
      }
    } catch (err: any) {
      console.warn("[getUserNgnAccountDetails] FossaPay live balance refresh warning:", err.message);
    }
  }

  const rawBal = Number(selectedDoc.balance ?? 0);
  const account: FormattedNgnAccountDetails = {
    bankName: selectedDoc.bankName || (selectedDoc.provider === "bellmonie" ? "Bloc MFB" : "Sterling MFB"),
    accountNumber: selectedDoc.accountNumber || "",
    accountName: selectedDoc.accountName || fallbackAccountName,
    status: selectedDoc.status || "active",
    provider: selectedDoc.provider || "bellmonie",
  };

  const balance: FormattedNgnBalance = {
    availableBalance: rawBal,
    ledgerBalance: rawBal,
    currency: selectedDoc.currency || "NGN",
  };

  return {
    account,
    balance,
    accounts: formattedAccounts,
    activeProvider: selectedDoc.provider || "bellmonie",
    canCreateBellmonie: !hasBellmonie,
  };
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


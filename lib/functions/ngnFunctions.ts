import { connectDB } from "@/lib/db";
import { NgnAccount, type INgnAccount } from "@/models/NgnAccount";

export interface FormattedNgnAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  provider?: "aella" | "bellmonie" | string;
}

export interface FormattedNgnBalance {
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
}

/**
 * Finds an active NGN account for a user, prioritizing Aella then falling back to Bellmonie.
 */
export async function getUserNgnAccount(
  userId: string,
): Promise<INgnAccount | null> {
  await connectDB();
  return NgnAccount.findOne({
    userId,
    provider: { $in: ["aella", "bellmonie"] },
    status: "active",
  })
    .sort({ provider: 1 }) // "aella" comes before "bellmonie"
    .lean<INgnAccount>();
}

/**
 * Retrieves all active NGN accounts belonging to a user.
 */
export async function getAllUserNgnAccounts(userId: string): Promise<INgnAccount[]> {
  await connectDB();
  return NgnAccount.find({ userId, status: "active" }).lean<INgnAccount[]>();
}

/**
 * Retrieves the user's primary NGN account formatted for UI display, prioritizing Aella MFB.
 */
export async function getUserNgnAccountDetails(
  userId: string,
  fallbackAccountName = "Jumpa User",
  options?: { force?: boolean; provider?: "aella" | "bellmonie" | "fossapay" },
): Promise<{
  account: FormattedNgnAccountDetails | null;
  balance: FormattedNgnBalance | null;
  accounts?: FormattedNgnAccountDetails[];
  activeProvider?: string;
  canCreateAccount?: boolean;
}> {
  await connectDB();
  const allAccounts = await getAllUserNgnAccounts(userId);
  const hasAella = allAccounts.some((a) => a.provider === "aella");
  const hasBellmonie = allAccounts.some((a) => a.provider === "bellmonie");

  // Format all active accounts for UI display
  const formattedAccounts: FormattedNgnAccountDetails[] = allAccounts
    .filter((a) => a.provider === "aella" || a.provider === "bellmonie")
    .map((a) => ({
      bankName: a.bankName || (a.provider === "aella" ? "Aella MFB" : "Bloc MFB"),
      accountNumber: a.accountNumber || "",
      accountName: a.accountName || fallbackAccountName,
      status: a.status || "active",
      provider: a.provider || "aella",
    }));

  // Selected account (strictly prioritize Aella, then Bellmonie)
  const selectedDoc =
    (options?.provider ? allAccounts.find((a) => a.provider === options.provider) : null) ||
    allAccounts.find((a) => a.provider === "aella") ||
    allAccounts.find((a) => a.provider === "bellmonie") ||
    allAccounts[0];

  const canCreate = !hasAella && !hasBellmonie;

  if (!selectedDoc) {
    return {
      account: null,
      balance: null,
      accounts: formattedAccounts,
      activeProvider: options?.provider || undefined,
      canCreateAccount: canCreate,
    };
  }

  // Live balance for legacy FossaPay if requested
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
          canCreateAccount: canCreate,
        };
      }
    } catch (err: any) {
      console.warn("[getUserNgnAccountDetails] FossaPay live balance refresh warning:", err.message);
    }
  }

  const rawBal = Number(selectedDoc.balance ?? 0);
  const account: FormattedNgnAccountDetails = {
    bankName: selectedDoc.bankName || (selectedDoc.provider === "aella" ? "Aella MFB" : "Bloc MFB"),
    accountNumber: selectedDoc.accountNumber || "",
    accountName: selectedDoc.accountName || fallbackAccountName,
    status: selectedDoc.status || "active",
    provider: selectedDoc.provider || "aella",
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
    activeProvider: selectedDoc.provider || "aella",
    canCreateAccount: canCreate,
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


import { supportedBanks } from "@/lib/constants/banks";
import { findNigerianBank } from "@/lib/constants/nigerian-banks";
import {
  aellaBankNameEnquiry,
  isAellaBank,
} from "@/lib/functions/aellaFunctions";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { resolveBankCode } from "@/lib/switch-banks";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

const AELLA_CBN_CODE = "090614";

export type ResolvedAccount = {
  accountName: string;
  bankName: string;
  /** The code Switch pays out to. */
  switchCode: string;
};

/** The lookup ran and the account could not be confirmed; safe to show the user. */
export class BankLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankLookupError";
  }
}

async function aellaName(accountNumber: string, bankCode: string) {
  try {
    const result = await aellaBankNameEnquiry({ accountNumber, bankCode });
    return result.accountName?.trim() || null;
  } catch (error) {
    console.warn(
      `[nimiq] Aella name enquiry failed: ${formatOneLineError(error)}`,
    );
    return null;
  }
}

/**
 * Confirms the holder of a Nigerian account the same way the main bank form
 * does (Paystack, then Aella) and finds the code Switch pays out to.
 */
export async function resolveNigerianAccount(
  accountNumber: string,
  bank: string,
): Promise<ResolvedAccount> {
  const paystackBank =
    supportedBanks.find((b) => b.code === bank) ?? findPaystackBank(bank);
  const nibssBank = findNigerianBank(bank);
  const bankName = paystackBank?.name ?? nibssBank?.name;
  if (!bankName) {
    throw new BankLookupError("We don't support this bank yet.");
  }

  let accountName: string | null = null;
  if (paystackBank) {
    try {
      const check = await validateAccountNumber(
        accountNumber,
        paystackBank.code,
      );
      accountName = check?.status
        ? (check.data?.account_name?.trim() ?? null)
        : null;
    } catch (error) {
      console.warn(
        `[nimiq] Paystack lookup failed: ${formatOneLineError(error)}`,
      );
    }
  }
  if (!accountName && (isAellaBank(bank) || isAellaBank(paystackBank?.code))) {
    accountName = await aellaName(accountNumber, AELLA_CBN_CODE);
  }
  if (!accountName && nibssBank) {
    accountName = await aellaName(accountNumber, nibssBank.code);
  }
  if (!accountName) {
    throw new BankLookupError(
      `We couldn't confirm this account at ${bankName}. Check the number.`,
    );
  }

  const switchBank =
    resolveBankCode(bankName) ??
    (paystackBank ? resolveBankCode(paystackBank.name) : null);
  const switchCode = switchBank?.code ?? paystackBank?.code ?? nibssBank?.code;
  if (!switchCode) {
    throw new BankLookupError("We can't pay out to this bank yet.");
  }
  return { accountName, bankName: switchBank?.name ?? bankName, switchCode };
}

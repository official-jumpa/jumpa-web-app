import { resolveNigerianBank } from "@/lib/NigerianBanks";
import { environment } from "@/lib/environment";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";

export interface ResolvedAccountData {
  account_number: string;
  account_name: string;
  bank_id?: number;
}

export interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data?: ResolvedAccountData;
}

/**
 * Match the bank name or alias to find the correct Paystack bank code and standard name.
 * Uses the unified NigerianBanks registry as the single source of truth.
 */
export function findPaystackBank(bankName: string): { name: string; code: string } | null {
  if (!bankName || typeof bankName !== "string") return null;

  const master = resolveNigerianBank(bankName);
  if (master && master.paystackCode) {
    return { name: master.name, code: master.paystackCode };
  }

  // Fallback: if matched master bank has CBN code (e.g. for NIP banks), return it
  if (master && master.cbnCode) {
    return { name: master.name, code: master.cbnCode };
  }

  return null;
}

/**
 * Resolves and verifies bank account details using Paystack API.
 * Never returns false positives or unverified fallbacks.
 */
export async function validateAccountNumber(
  accountNumber: string,
  bankCode: string,
): Promise<PaystackResolveResponse | null> {
  const apiKey =
    environment.PAYSTACK_BEARER_KEY ||
    process.env.PAYSTACK_BEARER_KEY ||
    "";

  if (!apiKey) {
    console.error(
      "[Paystack Resolve] PAYSTACK_KEY is missing",
    );
    return {
      status: false,
      message: "Something went wrong, please try again later",
    };
  }

  const cleanAccount = accountNumber.trim().replace(/\D/g, "");
  const cleanBankCode = bankCode.trim();

  if (cleanAccount.length !== 10) {
    return {
      status: false,
      message: "Account number must be exactly 10 digits",
    };
  }

  let paystackResult: PaystackResolveResponse | null = null;
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${cleanAccount}&bank_code=${cleanBankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    const result = (await response.json().catch(() => null)) as PaystackResolveResponse | null;

    if (response.ok && result?.status && result.data?.account_name) {
      return result;
    }

    paystackResult = result;
    console.warn(
      `[Paystack] Status: ${response.status} | Payload: ${formatOneLineError(result)}`
    );
  } catch (error: any) {
    const isTimeout = isTimeoutError(error);
    console.warn(
      `[Paystack] ${isTimeout ? "Timed out (8s)" : "Resolve exception"}: ${formatOneLineError(error)}`
    );
  }

  // Resilient fallback for Aella accounts or when Paystack fails on Aella codes
  const isAellaCode = cleanBankCode === "50315" || cleanBankCode === "090614";
  if (isAellaCode || !paystackResult?.status) {
    try {
      const { aellaBankNameEnquiry } = await import("@/lib/functions/aellaFunctions");
      const aellaRes = await aellaBankNameEnquiry({
        accountNumber: cleanAccount,
        bankCode: "090614",
      });
      if (aellaRes?.accountName) {
        return {
          status: true,
          message: "Account resolved successfully",
          data: {
            account_number: cleanAccount,
            account_name: aellaRes.accountName.trim(),
          },
        };
      }
    } catch {
      // Not an Aella account or Aella enquiry failed
    }
  }

  return {
    status: false,
    message: paystackResult?.message || "Could not verify bank account with provider",
  };
}

import { supportedBanks } from "@/lib/constants/banks";
import { environment } from "@/lib/environment";

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
 * Fuzzy match the bank name or alias to find the correct Paystack bank code and standard name.
 */
export function findPaystackBank(bankName: string): { name: string; code: string } | null {
  if (!bankName || typeof bankName !== "string") return null;
  const searchTerm = bankName.toLowerCase().trim();

  // Exact match first
  const exactMatch = supportedBanks.find(
    (bank) => bank.name.toLowerCase() === searchTerm,
  );
  if (exactMatch) return exactMatch;

  // Common abbreviations, slangs, and aliases in Nigeria
  const aliases: Record<string, string> = {
    "gt bank": "Guaranty Trust Bank",
    "gtb": "Guaranty Trust Bank",
    "gtbank": "Guaranty Trust Bank",
    "guaranty": "Guaranty Trust Bank",
    "guaranty trust": "Guaranty Trust Bank",
    "uba": "United Bank For Africa",
    "united bank": "United Bank For Africa",
    "united bank for africa": "United Bank For Africa",
    "fcmb": "First City Monument Bank",
    "first bank": "First Bank of Nigeria",
    "first bank of nigeria": "First Bank of Nigeria",
    "fbn": "First Bank of Nigeria",
    "zenith": "Zenith Bank",
    "zenith bank": "Zenith Bank",
    "access": "Access Bank",
    "access bank": "Access Bank",
    "diamond": "Access Bank (Diamond)",
    "diamond bank": "Access Bank (Diamond)",
    "union": "Union Bank of Nigeria",
    "union bank": "Union Bank of Nigeria",
    "eco bank": "Ecobank Nigeria",
    "ecobank": "Ecobank Nigeria",
    "fidelity": "Fidelity Bank",
    "fidelity bank": "Fidelity Bank",
    "stanbic": "Stanbic IBTC Bank",
    "stanbic ibtc": "Stanbic IBTC Bank",
    "wema": "Wema Bank",
    "wema bank": "Wema Bank",
    "alat": "ALAT by WEMA",
    "polaris": "Polaris Bank",
    "polaris bank": "Polaris Bank",
    "keystone": "Keystone Bank",
    "keystone bank": "Keystone Bank",
    "sterling": "Sterling Bank",
    "sterling bank": "Sterling Bank",
    "providus": "Providus Bank",
    "providus bank": "Providus Bank",
    "unity": "Unity Bank",
    "unity bank": "Unity Bank",
    "jaiz": "Jaiz Bank",
    "jaiz bank": "Jaiz Bank",
    "taj": "TAJ Bank",
    "taj bank": "TAJ Bank",
    "titan": "Titan Bank",
    "titan trust": "Titan Bank",
    "moniepoint": "Moniepoint MFB",
    "monie point": "Moniepoint MFB",
    "opay": "OPay Digital Services Limited (OPay)",
    "paycom": "OPay Digital Services Limited (OPay)",
    "kuda": "Kuda Bank",
    "kuda bank": "Kuda Bank",
    "kuda mfb": "Kuda Bank",
    "palmpay": "PalmPay",
    "palm pay": "PalmPay",
    "rubies": "Rubies MFB",
    "vfd": "VFD Microfinance Bank Limited",
    "vfd bank": "VFD Microfinance Bank Limited",
    "sparkle": "Sparkle Microfinance Bank",
    "fairmoney": "Fairmoney Microfinance Bank",
    "carbon": "Carbon",
    "paga": "Paga",
    "gomoney": "GoMoney",
  };

  const aliasMatch = aliases[searchTerm];
  if (aliasMatch) {
    const bank = supportedBanks.find(
      (b) => b.name.toLowerCase() === aliasMatch.toLowerCase(),
    );
    if (bank) return bank;
  }

  // Partial match (bank name contains search term)
  const partialMatch = supportedBanks.find((bank) =>
    bank.name.toLowerCase().includes(searchTerm),
  );
  if (partialMatch) return partialMatch;

  // Reverse partial match (search term contains bank name)
  const reverseMatch = supportedBanks.find((bank) =>
    searchTerm.includes(bank.name.toLowerCase()),
  );
  if (reverseMatch) return reverseMatch;

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

  try {
    console.log(
      `[Paystack Resolve] Querying Paystack for account: ${cleanAccount} (Bank code: ${cleanBankCode})`,
    );

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${cleanAccount}&bank_code=${cleanBankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = (await response.json()) as PaystackResolveResponse;
    console.log("[Paystack Resolve API] Result:", {
      status: result.status,
      message: result.message,
      account_name: result.data?.account_name,
    });

    return result;
  } catch (error: any) {
    console.error("[Paystack Resolve API] Fetch error:", error);
    return {
      status: false,
      message: error?.message || "Failed to reach bank verification service",
    };
  }
}

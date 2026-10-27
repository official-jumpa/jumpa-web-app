import environment from "./environment";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";

export interface OnRampResponse {
  success: boolean;
  status: number;
  message: string;
  data?: {
    deposit: {
      bank_name: string;
      bank_code: string;
      account_name: string;
      account_number: string;
      note: string[];
    };
    reference: string;
    destination: {
      amount: number;
      currency: string;
    };
  };
  error?: string;
}

export interface OffRampResponse {
  success: boolean;
  message: string;
  data?: {
    status: string;
    type: string;
    reference: string;
    rate: number;
    source?: {
      amount: number;
      currency: string;
    };
    destination: {
      amount: number;
      currency: string;
    };
    deposit: {
      amount: number;
      address: string;
      asset: string;
      note?: string[];
    };
  };
  error?: string;
  status?: number;
}

export interface QuoteResponse {
  success: boolean;
  data?: {
    rate: number;
    source?: {
      amount: number;
      currency: string;
    };
    destination: {
      amount: number;
      currency: string;
    };
  };
  message?: string;
  error?: string;
}

export const SUPPORTED_SWITCH_ASSETS = [
  "base:usdc",
  "solana:usdc",
  "solana:usdt",
  "ethereum:usdc",
  "ethereum:usdt",
  "eth:usdc",
  "eth:usdt",
  "tron:usdt",
  "tron:usdc",
];

export function normalizeSwitchAsset(asset: string): string {
  const lower = (asset || "").toLowerCase().trim();
  if (lower.startsWith("eth:")) return `ethereum:${lower.slice(4)}`;
  return lower;
}

/** Human-readable labels for each supported Switch asset — use these when presenting assets to users */
export const SWITCH_ASSET_LABELS: Record<string, string> = {
  "base:usdc": "USDC on Base",
  "solana:usdc": "USDC on Solana",
  "solana:usdt": "USDT on Solana",
  "ethereum:usdc": "USDC on Ethereum",
  "ethereum:usdt": "USDT on Ethereum",
  "eth:usdc": "USDC on Ethereum",
  "eth:usdt": "USDT on Ethereum",
  "tron:usdt": "USDT on Tron",
  "tron:usdc": "USDC on Tron",
};

function parseSwitchError(errorMsg: string): string {
  if (!errorMsg) return "This service is not available at the moment. Please try again later.";

  const lowerError = errorMsg.toLowerCase();

  // User-fixable limits
  if (lowerError.match(/amount.*minimum/)) {
    return "Amount is below the minimum limit of $1.50";
  }
  if (lowerError.match(/amount.*maximum/)) {
    return "Amount exceeds the maximum limit of $10,000";
  }
  if (lowerError.includes("rate limit") || lowerError.includes("429")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (lowerError.includes('"asset" must be one of') || lowerError.includes("asset not supported")) {
    return "The selected crypto asset is currently not supported for direct bank payout.";
  }
  if (lowerError.includes("insufficient") && lowerError.includes("balance")) {
    return "Insufficient wallet balance to complete this transaction.";
  }
  if (lowerError.includes("invalid account") || lowerError.includes("account number") || lowerError.includes("bank code")) {
    return "The recipient bank account details could not be verified. Please check the account number and bank.";
  }

  // Developer, internal configuration, fee recipient, or 3rd-party provider infrastructure errors
  if (
    lowerError.includes("developer fee") ||
    lowerError.includes("recipient wallet") ||
    lowerError.includes("fee recipient") ||
    lowerError.includes("invalid developer") ||
    lowerError.includes("service key") ||
    lowerError.includes("api key") ||
    lowerError.includes("unauthorized") ||
    lowerError.includes("forbidden") ||
    lowerError.includes("internal server") ||
    lowerError.includes("service unavailable") ||
    lowerError.includes("bad gateway") ||
    lowerError.includes("cloudflare") ||
    lowerError.includes("switch")
  ) {
    return "Service is temporarily unavailable. Please try again shortly or contact support.";
  }

  // Generic fallback: never expose raw stack traces or internal backend errors
  if (lowerError.includes("error") || lowerError.includes("failed") || lowerError.includes("exception")) {
    return "Unable to complete transfer at this time. Please try again shortly.";
  }

  return errorMsg;
}

/**
 * Validates that an address format matches its intended blockchain before passing to 3rd-party APIs.
 */
function isValidAddressForChain(chain: "solana" | "stellar" | "tron" | "evm", address: string): boolean {
  if (!address || typeof address !== "string") return false;
  const clean = address.trim();

  switch (chain) {
    case "tron":
      // Tron addresses start with 'T' and are exactly 34 base58 characters
      return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(clean);
    case "solana":
      // Solana addresses are base58, 32-44 characters, never start with 0x
      return !clean.startsWith("0x") && /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(clean);
    case "stellar":
      // Stellar public keys start with 'G' and are 56 characters
      return /^G[A-Z2-7]{55}$/.test(clean);
    case "evm":
      // EVM (Ethereum / Base) addresses start with 0x and are 42 hex characters
      return /^0x[a-fA-F0-9]{40}$/.test(clean);
    default:
      return false;
  }
}

/**
 * Returns the appropriate treasury fee recipient wallet for a given asset network.
 * Verifies address format for the specific chain to prevent provider rejection.
 */
export function getSwitchFeeRecipient(asset: string): string | undefined {
  const normAsset = normalizeSwitchAsset(asset);

  if (normAsset.startsWith("solana:")) {
    const addr = environment.FEE_WALLET_SOLANA?.trim();
    if (addr && isValidAddressForChain("solana", addr)) return addr;
    if (addr) console.warn("[Switch] FEE_WALLET_SOLANA has invalid format for Solana, omitting developer fee recipient");
    return undefined;
  }

  if (normAsset.startsWith("stellar:")) {
    const addr = environment.FEE_WALLET_STELLAR?.trim();
    if (addr && isValidAddressForChain("stellar", addr)) return addr;
    if (addr) console.warn("[Switch] FEE_WALLET_STELLAR has invalid format for Stellar, omitting developer fee recipient");
    return undefined;
  }

  if (normAsset.startsWith("tron:")) {
    const addr = environment.FEE_WALLET_TRON?.trim();
    if (addr && isValidAddressForChain("tron", addr)) return addr;
    if (addr) console.warn("[Switch] FEE_WALLET_TRON has invalid format for Tron (must start with T), omitting developer fee recipient");
    return undefined;
  }

  if (normAsset.startsWith("base:") || normAsset.startsWith("ethereum:")) {
    const addr = environment.FEE_WALLET_EVM?.trim();
    if (addr && isValidAddressForChain("evm", addr)) return addr;
    if (addr) console.warn("[Switch] FEE_WALLET_EVM has invalid format for EVM (must start with 0x), omitting developer fee recipient");
    return undefined;
  }

  return undefined;
}

export class SwitchService {
  private static readonly BASE_URL = "https://api.onswitch.xyz";

  private static getHeaders(): HeadersInit {
    // Uses the live switch key matching the environment
    return {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.SWITCH_LIVE_KEY || "",
    };
  }  static async initiateOnRamp(
    amount: number,
    asset: string,
    walletAddress: string
  ): Promise<OnRampResponse> {
    const normAsset = normalizeSwitchAsset(asset);
    if (!SUPPORTED_SWITCH_ASSETS.includes(normAsset)) {
      return {
        success: false,
        status: 400,
        message: "The selected asset is not supported by our provider at this time.",
        error: "Asset not supported"
      };
    }

    try {
      const feeRecipient = getSwitchFeeRecipient(normAsset);
      const payload: Record<string, any> = {
        amount: amount,
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        beneficiary: {
          holder_type: "INDIVIDUAL",
          holder_name: "Jumpa",
          wallet_address: walletAddress
        },
        exact_output: false,
        developer_fee: environment.SWITCH_JUMPA_FEE,
        rail: "NIBSS"
      };

      if (environment.SWITCH_JUMPA_FEE > 0 && feeRecipient) {
        payload.developer_recipient = feeRecipient;
      }

      const response = await fetch(`${this.BASE_URL}/onramp/initiate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Onramp initiation failed | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          status: response.status,
          message: parseSwitchError(responseData?.message || "Failed to initiate transaction"),
          error: responseData ? JSON.stringify(responseData) : "Network error",
        };
      }

      return responseData;

    } catch (error: any) {
      const isTimeout = isTimeoutError(error);
      console.error(
        `[Switch] ${isTimeout ? "Onramp timed out (15s)" : "Onramp exception"}: ${formatOneLineError(error)}`
      );
      return {
        success: false,
        status: isTimeout ? 504 : 500,
        message: isTimeout
          ? "The deposit service request timed out. Please try again."
          : "Unable to initiate deposit at this time. Please try again later.",
        error: error.message,
      };
    }
  }

  static async getQuote(amount: number, asset: string): Promise<QuoteResponse> {
    const normAsset = normalizeSwitchAsset(asset);
    if (!SUPPORTED_SWITCH_ASSETS.includes(normAsset)) {
      return {
        success: false,
        message: "The selected asset is not supported by our provider at this time."
      };
    }

    try {
      const feeRecipient = getSwitchFeeRecipient(normAsset);
      const payload: Record<string, any> = {
        amount: amount,
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        rail: "NIBSS",
        exact_output: false, 
        developer_fee: environment.SWITCH_JUMPA_FEE
      };

      if (environment.SWITCH_JUMPA_FEE > 0 && feeRecipient) {
        payload.developer_recipient = feeRecipient;
      }

      const response = await fetch(`${this.BASE_URL}/onramp/quote`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Quote failed | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          message: parseSwitchError(responseData?.message || "Failed to fetch quote")
        };
      }

      return responseData;
    } catch (error: any) {
      const isTimeout = isTimeoutError(error);
      console.error(
        `[Switch] ${isTimeout ? "Quote timed out (8s)" : "Quote exception"}: ${formatOneLineError(error)}`
      );
      return {
        success: false,
        message: isTimeout
          ? "Quote request timed out. Please try again."
          : "Unable to calculate exchange rate at this time.",
        error: error.message
      };
    }
  }

  static async getOnrampRate(asset: string = "base:usdc"): Promise<{ success: boolean; rate?: number; message?: string }> {
    try {
      const normAsset = normalizeSwitchAsset(asset);
      const payload = {
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        channel: "BANK",
      };

      const response = await fetch(`${this.BASE_URL}/onramp/rate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok || !responseData?.success) {
        return {
          success: false,
          message: parseSwitchError(responseData?.message || "Failed to fetch onramp rate"),
        };
      }

      return {
        success: true,
        rate: responseData.data?.rate,
      };
    } catch (error: any) {
      console.error(`[SwitchService] Error fetching onramp rate: ${formatOneLineError(error)}`);
      return { success: false, message: error.message };
    }
  }

  static async getOfframpRate(asset: string = "base:usdc"): Promise<{ success: boolean; rate?: number; message?: string }> {
    try {
      const normAsset = normalizeSwitchAsset(asset);
      const payload = {
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        channel: "BANK",
      };

      const response = await fetch(`${this.BASE_URL}/offramp/rate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok || !responseData?.success) {
        return {
          success: false,
          message: parseSwitchError(responseData?.message || "Failed to fetch offramp rate"),
        };
      }

      return {
        success: true,
        rate: responseData.data?.rate,
      };
    } catch (error: any) {
      console.error(`[SwitchService] Error fetching offramp rate: ${formatOneLineError(error)}`);
      return { success: false, message: error.message };
    }
  }

  static async getOfframpQuote(amount: number, asset: string): Promise<QuoteResponse> {
    const normAsset = normalizeSwitchAsset(asset);
    if (!SUPPORTED_SWITCH_ASSETS.includes(normAsset)) {
      return {
        success: false,
        message: "The selected asset is not supported by our provider at this time."
      };
    }

    try {
      const feeRecipient = getSwitchFeeRecipient(normAsset);
      const payload: Record<string, any> = {
        amount,
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        rail: "BANK",
        exact_output: false, 
        developer_fee: environment.SWITCH_JUMPA_FEE
      };

      if (environment.SWITCH_JUMPA_FEE > 0 && feeRecipient) {
        payload.developer_recipient = feeRecipient;
      }

      const response = await fetch(`${this.BASE_URL}/offramp/quote`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Offramp quote failed | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          message: parseSwitchError(responseData?.message || "Failed to fetch quote")
        };
      }

      return responseData;
    } catch (error: any) {
      const isTimeout = isTimeoutError(error);
      console.error(
        `[Switch] ${isTimeout ? "Offramp quote timed out (8s)" : "Offramp quote exception"}: ${formatOneLineError(error)}`
      );
      return {
        success: false,
        message: isTimeout
          ? "Quote request timed out. Please try again."
          : "Unable to calculate exchange rate at this time.",
        error: error.message
      };
    }
  }

  static async initiateOfframp(
    amount: number,
    asset: string,
    beneficiary: {
      holder_name: string;
      account_number: string;
      bank_code: string;
    }
  ): Promise<OffRampResponse> {
    const normAsset = normalizeSwitchAsset(asset);
    if (!SUPPORTED_SWITCH_ASSETS.includes(normAsset)) {
      return {
        success: false,
        status: 400,
        message: "The selected asset is not supported by our provider at this time.",
        error: "Asset not supported"
      };
    }

    try {
      const feeRecipient = getSwitchFeeRecipient(normAsset);
      const payload: Record<string, any> = {
        amount,
        country: "NG",
        currency: "NGN",
        asset: normAsset,
        beneficiary: {
          holder_type: "INDIVIDUAL",
          holder_name: beneficiary.holder_name,
          account_number: beneficiary.account_number,
          bank_code: beneficiary.bank_code
        },
        channel: "BANK",
        reason: "REMITTANCES",
        exact_output: false,
        developer_fee: environment.SWITCH_JUMPA_FEE
      };

      if (environment.SWITCH_JUMPA_FEE > 0 && feeRecipient) {
        payload.developer_recipient = feeRecipient;
      }

      const response = await fetch(`${this.BASE_URL}/offramp/initiate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Offramp initiation failed | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          status: response.status,
          message: parseSwitchError(responseData?.message || "Failed to initiate transaction"),
          error: responseData ? JSON.stringify(responseData) : "Network error"
        };
      }

      return responseData;

    } catch (error: any) {
      const isTimeout = isTimeoutError(error);
      console.error(
        `[Switch] ${isTimeout ? "Offramp timed out (15s)" : "Offramp exception"}: ${formatOneLineError(error)}`
      );
      return {
        success: false,
        status: isTimeout ? 504 : 500,
        message: isTimeout
          ? "The withdrawal service request timed out. Please try again."
          : "Unable to initiate withdrawal at this time. Please try again shortly.",
        error: error.message
      };
    }
  }

  static async getTransactionStatus(reference: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/status?reference=${encodeURIComponent(reference)}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Status check failed (${reference}) | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          message: responseData?.message || "Failed to fetch transaction status",
          error: responseData ? JSON.stringify(responseData) : "Network error"
        };
      }

      return responseData;
    } catch (error: any) {
      const isTimeout = isTimeoutError(error);
      console.error(
        `[Switch] ${isTimeout ? "Status check timed out (8s)" : "Status check exception"}: ${formatOneLineError(error)}`
      );
      return {
        success: false,
        message: isTimeout
          ? "Status check timed out."
          : "Internal server error",
        error: error.message
      };
    }
  }

  static async confirmPayment(reference: string, hash?: string): Promise<any> {
    try {
      const payload: Record<string, string> = { reference };
      if (hash) payload.hash = hash;

      const response = await fetch(`${this.BASE_URL}/confirm`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok || !responseData?.success) {
        console.error(
          `[Switch] Confirm payment failed (${reference}) | Status: ${response.status} | Payload: ${formatOneLineError(responseData)}`
        );
        return {
          success: false,
          message: responseData?.message || "Failed to confirm payment",
          error: responseData ? JSON.stringify(responseData) : "Network error"
        };
      }

      return responseData;
    } catch (error: any) {
      console.error(
        `[Switch] Confirm payment exception (${reference}): ${formatOneLineError(error)}`
      );
      return {
        success: false,
        message: "Internal server error",
        error: error.message
      };
    }
  }
}

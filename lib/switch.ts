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
  "base:usdc", "base:cngn", "solana:usdc", "solana:usdt", "ethereum:usdc", "ethereum:usdt",
  "polygon:usdc", "polygon:usdt", "bsc:usdc", "bsc:usdt", "bsc:cngn", "arbitrum:usdc",
  "arbitrum:usdt", "optimism:usdc", "optimism:usdt", "avalanche:usdc", "avalanche:usdt",
  "gnosis:usdc", "gnosis:usdt", "tron:usdt", "assetchain:usdc", "assetchain:usdt",
  "monad:usdc", "monad:usdt", "linea:usdc", "linea:usdt", "berachain:usdc", "berachain:usdt",
  "sonic:usdc", "plasma:usdt", "bitcoin:btc"
];

/** Human-readable labels for each supported Switch asset — use these when presenting assets to users */
export const SWITCH_ASSET_LABELS: Record<string, string> = {
  "base:usdc": "USDC on Base",
  "base:cngn": "cNGN on Base",
  "solana:usdc": "USDC on Solana",
  "solana:usdt": "USDT on Solana",
  "ethereum:usdc": "USDC on Ethereum",
  "ethereum:usdt": "USDT on Ethereum",
  "polygon:usdc": "USDC on Polygon",
  "polygon:usdt": "USDT on Polygon",
  "bsc:usdc": "USDC on BNB Chain",
  "bsc:usdt": "USDT on BNB Chain",
  "bsc:cngn": "cNGN on BNB Chain",
  "arbitrum:usdc": "USDC on Arbitrum",
  "arbitrum:usdt": "USDT on Arbitrum",
  "optimism:usdc": "USDC on Optimism",
  "optimism:usdt": "USDT on Optimism",
  "avalanche:usdc": "USDC on Avalanche",
  "avalanche:usdt": "USDT on Avalanche",
  "gnosis:usdc": "USDC on Gnosis",
  "gnosis:usdt": "USDT on Gnosis",
  "tron:usdt": "USDT on Tron",
  "assetchain:usdc": "USDC on AssetChain",
  "assetchain:usdt": "USDT on AssetChain",
  "monad:usdc": "USDC on Monad",
  "monad:usdt": "USDT on Monad",
  "linea:usdc": "USDC on Linea",
  "linea:usdt": "USDT on Linea",
  "berachain:usdc": "USDC on Berachain",
  "berachain:usdt": "USDT on Berachain",
  "sonic:usdc": "USDC on Sonic",
  "plasma:usdt": "USDT on Plasma",
  "bitcoin:btc": "BTC on Bitcoin",
};

function parseSwitchError(errorMsg: string): string {
  if (!errorMsg) return "An unexpected error occurred with the provider. Please try again.";

  const lowerError = errorMsg.toLowerCase();

  if (lowerError.match(/amount.*minimum/)) {
    return "Amount is below the minimum limit of $1.5";
  }
  if (lowerError.match(/amount.*maximum/)) {
    return "Amount exceeds the maximum limit of $10000";
  }
  if (lowerError.includes("rate limit") || lowerError.includes("429")) {
    return "Too many requests. Please try again later.";
  }
  if (lowerError.includes("\"asset\" must be one of")) {
    return "The selected asset is not supported by our provider at this time.";
  }

  return errorMsg;
}

export class SwitchService {
  private static readonly BASE_URL = "https://api.onswitch.xyz";

  private static getHeaders(): HeadersInit {
    // Uses the live switch key matching the environment
    return {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.SWITCH_LIVE_KEY || "",
    };
  }

  static async initiateOnRamp(
    amount: number,
    asset: string,
    walletAddress: string,
    isExactOut: boolean = false
  ): Promise<OnRampResponse> {
    if (!SUPPORTED_SWITCH_ASSETS.includes(asset.toLowerCase())) {
      return {
        success: false,
        status: 400,
        message: "The selected asset is not supported by our provider at this time.",
        error: "Asset not supported"
      };
    }

    try {
      const payload = {
        amount: amount,
        country: "NG",
        currency: "NGN",
        asset: asset,
        beneficiary: {
          holder_type: "INDIVIDUAL",
          holder_name: "Jumpa",
          wallet_address: walletAddress
        },
        exact_output: isExactOut,
        rail: "NIBSS"
      };

      console.log("[SwitchService] Initiating onramp:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.BASE_URL}/onramp/initiate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      console.log(`[SwitchService] Onramp response: ${responseData.success ? "Success" : "Failed"}`);

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          status: response.status,
          message: parseSwitchError(responseData.message || "Failed to initiate transaction"),
          error: JSON.stringify(responseData)
        };
      }

      return responseData;

    } catch (error: any) {
      console.error("[SwitchService] Error initiating onramp:", error);
      return {
        success: false,
        status: 500,
        message: "Internal server error",
        error: error.message
      };
    }
  }

  static async getQuote(amount: number, asset: string, isExactOut: boolean = false): Promise<QuoteResponse> {
    if (!SUPPORTED_SWITCH_ASSETS.includes(asset.toLowerCase())) {
      return {
        success: false,
        message: "The selected asset is not supported by our provider at this time."
      };
    }

    try {
      const payload = {
        amount: amount,
        country: "NG",
        currency: "NGN",
        asset: asset,
        rail: "NIBSS",
        exact_output: isExactOut
      };

      const response = await fetch(`${this.BASE_URL}/onramp/quote`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          message: parseSwitchError(responseData.message || "Failed to fetch quote")
        };
      }

      return responseData;
    } catch (error: any) {
      console.error("[SwitchService] Error fetching quote:", error);
      return {
        success: false,
        message: "Internal server error",
        error: error.message
      };
    }
  }
  static async getOfframpQuote(amount: number, asset: string, isExactOut: boolean = false): Promise<QuoteResponse> {
    if (!SUPPORTED_SWITCH_ASSETS.includes(asset.toLowerCase())) {
      return {
        success: false,
        message: "The selected asset is not supported by our provider at this time."
      };
    }

    try {
      const payload = {
        amount,
        country: "NG",
        currency: "NGN",
        asset,
        rail: "BANK",
        exact_output: isExactOut
      };

      const response = await fetch(`${this.BASE_URL}/offramp/quote`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log("[SwitchService] response from switch get offramp quote", responseData)

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          message: parseSwitchError(responseData.message || "Failed to fetch quote")
        };
      }

      return responseData;
    } catch (error: any) {
      console.error("[SwitchService] Error fetching offramp quote:", error);
      return {
        success: false,
        message: "Internal server error",
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
    },
    isExactOut: boolean = false
  ): Promise<OffRampResponse> {
    if (!SUPPORTED_SWITCH_ASSETS.includes(asset.toLowerCase())) {
      return {
        success: false,
        status: 400,
        message: "The selected asset is not supported by our provider at this time.",
        error: "Asset not supported"
      };
    }

    try {
      const payload = {
        amount,
        country: "NG",
        currency: "NGN",
        asset,
        beneficiary: {
          holder_type: "INDIVIDUAL",
          holder_name: beneficiary.holder_name,
          account_number: beneficiary.account_number,
          bank_code: beneficiary.bank_code
        },
        channel: "BANK",
        reason: "REMITTANCES",
        exact_output: isExactOut
      };

      console.log("[SwitchService] Initiating offramp:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.BASE_URL}/offramp/initiate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log(`[SwitchService] Offramp: ${responseData.success ? "Success" : "Failed"}`);
      console.log("response from switch", responseData)

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          status: response.status,
          message: parseSwitchError(responseData.message || "Failed to initiate transaction"),
          error: JSON.stringify(responseData)
        };
      }

      return responseData;

    } catch (error: any) {
      console.error("[SwitchService] Error initiating offramp:", error);
      return {
        success: false,
        status: 500,
        message: "Internal server error",
        error: error.message
      };
    }
  }

  static async getTransactionStatus(reference: string): Promise<any> {
    try {
      console.log(`[SwitchService] Fetching status for reference: ${reference}`);
      const response = await fetch(`${this.BASE_URL}/status?reference=${reference}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const responseData = await response.json();
      const statusStr = responseData.success ? responseData.data?.status || "Unknown" : "Failed";
      console.log(`[SwitchService] Status for reference ${reference}: ${statusStr}`);

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          message: responseData.message || "Failed to fetch transaction status",
          error: JSON.stringify(responseData)
        };
      }

      return responseData;
    } catch (error: any) {
      console.error(`[SwitchService] Error fetching status for reference ${reference}:`, error);
      return {
        success: false,
        message: "Internal server error",
        error: error.message
      };
    }
  }

  static async confirmPayment(reference: string, hash?: string): Promise<any> {
    try {
      console.log(`[SwitchService] Confirming payment for reference: ${reference}, hash: ${hash}`);
      const payload: Record<string, string> = { reference };
      if (hash) payload.hash = hash;

      const response = await fetch(`${this.BASE_URL}/confirm`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log(`[SwitchService] response for reference ${reference}: ${responseData.success ? "Success" : "Failed"}`);

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          message: responseData.message || "Failed to confirm payment",
          error: JSON.stringify(responseData)
        };
      }

      return responseData;
    } catch (error: any) {
      console.error(`[SwitchService] Error confirming payment for reference ${reference}:`, error);
      return {
        success: false,
        message: "Internal server error",
        error: error.message
      };
    }
  }
}

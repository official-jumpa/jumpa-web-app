/**
 * DeFindex Yield Protocol API Client
 * Facilitates vault creation, deposits, withdrawals, and yield tracking on Stellar Testnet & Mainnet.
 */

import { environment } from "@/lib/environment";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";

export interface DefindexRoleConfig {
  manager: string;
  emergencyManager: string;
  rebalanceManager: string;
  feeReceiver: string;
}

export interface DefindexStrategyConfig {
  address: string;
  name: string;
  paused?: boolean;
}

export interface DefindexAssetConfig {
  address: string;
  strategies: DefindexStrategyConfig[];
}

export interface CreateVaultDepositParams {
  roles: DefindexRoleConfig;
  vaultFeeBps: number;
  assets: DefindexAssetConfig[];
  name: string;
  symbol: string;
  upgradable?: boolean;
  caller: string;
  depositAmounts: number[];
}

export interface DepositParams {
  amounts: number[];
  caller: string;
  invest?: boolean;
  slippageBps?: number;
}

export interface WithdrawParams {
  amounts: number[];
  caller: string;
}

export class DefindexClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly network: "testnet" | "mainnet";

  constructor(
    apiKey = environment.DEFINDEX_API_KEY,
    baseUrl = environment.DEFINDEX_BASE_URL,
    network: "testnet" | "mainnet" = "mainnet"
  ) {
    this.apiKey = apiKey || process.env.DEFINDEX_API_KEY || "";
    this.baseUrl = (baseUrl || process.env.DEFINDEX_BASE_URL || "https://api.defindex.io").replace(/\/$/, "");
    this.network = network;
  }

  private get headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Helper for POST requests under a specific vault
   */
  async postVault<T = any>(endpoint: string, vaultAddress: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/vault/${vaultAddress}/${endpoint}?network=${this.network}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error || data?.message || formatOneLineError(data);
        console.error(`[DeFindex:Vault:${endpoint}] Status: ${res.status} | Error: ${formatOneLineError(err)}`);
        throw new Error(data?.error || data?.message || "DeFindex vault operation failed");
      }
      return data as T;
    } catch (err: any) {
      if (isTimeoutError(err)) {
        console.error(`[DeFindex:Vault:${endpoint}] Request timed out after 15s`);
        throw new Error("Request timed out. Please try again later.");
      }
      throw err;
    }
  }

  /**
   * Helper for GET requests under a specific vault
   */
  async getVault<T = any>(endpoint: string, vaultAddress: string, params?: Record<string, string>): Promise<T> {
    const query = new URLSearchParams({ network: this.network, ...params }).toString();
    const url = `${this.baseUrl}/vault/${vaultAddress}/${endpoint}?${query}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: this.headers,
        signal: AbortSignal.timeout(8000), // 8s fast read timeout
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error || data?.message || formatOneLineError(data);
        console.error(`[DeFindex:Vault:${endpoint}] Status: ${res.status} | Error: ${formatOneLineError(err)}`);
        throw new Error(data?.error || data?.message || "Failed to fetch vault data");
      }
      return data as T;
    } catch (err: any) {
      if (isTimeoutError(err)) {
        console.error(`[DeFindex:Vault:${endpoint}] Read timed out after 8s`);
        throw new Error("Query timed out");
      }
      throw err;
    }
  }

  /**
   * Factory endpoint to deploy a vault
   */
  async postFactory<T = any>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/factory/${endpoint}?network=${this.network}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error || data?.message || formatOneLineError(data);
        console.error(`[DeFindex:Factory:${endpoint}] Status: ${res.status} | Error: ${formatOneLineError(err)}`);
        throw new Error(data?.error || data?.message || "Vault factory deployment failed");
      }
      return data as T;
    } catch (err: any) {
      if (isTimeoutError(err)) {
        console.error(`[DeFindex:Factory:${endpoint}] Deployment timed out after 15s`);
        throw new Error("Vault factory request timed out");
      }
      throw err;
    }
  }

  /**
   * Submits a signed Soroban transaction XDR to the Stellar network via DeFindex
   */
  async send(signedXdr: string): Promise<{ txHash: string; [key: string]: any }> {
    const url = `${this.baseUrl}/send?network=${this.network}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ xdr: signedXdr }),
        signal: AbortSignal.timeout(20000), // 20s broadcast timeout
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error || data?.message || formatOneLineError(data);
        console.error(`[DeFindex:Send] Broadcast failed (${res.status}): ${formatOneLineError(err)}`);
        throw new Error(data?.error || data?.message || "Transaction broadcast failed");
      }
      return data;
    } catch (err: any) {
      if (isTimeoutError(err)) {
        console.error("[DeFindex:Send] Broadcast timed out after 20s");
        throw new Error("Transaction broadcast timed out");
      }
      throw err;
    }
  }

  /**
   * Builds an unsigned transaction to deploy a vault and make an initial deposit
   */
  async createVaultDeposit(params: CreateVaultDepositParams): Promise<{ xdr: string; [key: string]: any }> {
    return this.postFactory("create-vault-deposit", params as unknown as Record<string, unknown>);
  }

  /**
   * Builds an unsigned transaction to deposit assets into a vault
   */
  async deposit(vaultAddress: string, params: DepositParams): Promise<{ xdr: string; [key: string]: any }> {
    return this.postVault("deposit", vaultAddress, params as unknown as Record<string, unknown>);
  }

  /**
   * Builds an unsigned transaction to withdraw assets from a vault
   */
  async withdraw(vaultAddress: string, params: WithdrawParams): Promise<{ xdr: string; [key: string]: any }> {
    return this.postVault("withdraw", vaultAddress, params as unknown as Record<string, unknown>);
  }

  /**
   * Fetches user balance in the vault (underlying asset stroops array)
   */
  async getBalance(vaultAddress: string, userAddress: string): Promise<{ underlyingBalance: (string | number)[]; [key: string]: any }> {
    return this.getVault("balance", vaultAddress, { from: userAddress });
  }

  /**
   * Fetches the net APY of the vault
   */
  async getApy(vaultAddress: string): Promise<{ apy: number; [key: string]: any }> {
    return this.getVault("apy", vaultAddress);
  }
}

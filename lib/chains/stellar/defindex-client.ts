/**
 * DeFindex Yield Protocol API Client
 * Facilitates vault creation, deposits, withdrawals, and yield tracking on Stellar Testnet & Mainnet.
 */

import { environment } from "@/lib/environment";

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
    network: "testnet" | "mainnet" = "testnet"
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
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data?.error || data?.message || JSON.stringify(data);
      throw new Error(`[DeFindex POST /vault/${endpoint}] Failed (${res.status}): ${err}`);
    }
    return data as T;
  }

  /**
   * Helper for GET requests under a specific vault
   */
  async getVault<T = any>(endpoint: string, vaultAddress: string, params?: Record<string, string>): Promise<T> {
    const query = new URLSearchParams({ network: this.network, ...params }).toString();
    const url = `${this.baseUrl}/vault/${vaultAddress}/${endpoint}?${query}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data?.error || data?.message || JSON.stringify(data);
      throw new Error(`[DeFindex GET /vault/${endpoint}] Failed (${res.status}): ${err}`);
    }
    return data as T;
  }

  /**
   * Factory endpoint to deploy a vault
   */
  async postFactory<T = any>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/factory/${endpoint}?network=${this.network}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data?.error || data?.message || JSON.stringify(data);
      throw new Error(`[DeFindex Factory /${endpoint}] Failed (${res.status}): ${err}`);
    }
    return data as T;
  }

  /**
   * Submits a signed Soroban transaction XDR to the Stellar network via DeFindex
   */
  async send(signedXdr: string): Promise<{ txHash: string; [key: string]: any }> {
    const url = `${this.baseUrl}/send?network=${this.network}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ xdr: signedXdr }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = data?.error || data?.message || JSON.stringify(data);
      throw new Error(`[DeFindex POST /send] Broadcast failed (${res.status}): ${err}`);
    }
    return data;
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

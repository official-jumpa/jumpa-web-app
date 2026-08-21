import * as StellarSdk from "@stellar/stellar-sdk";
import { environment } from "@/lib/environment";

export const STELLAR_TESTNET_HORIZON = environment.STELLAR_TESTNET;
export const STELLAR_MAINNET_HORIZON = environment.STELLAR_MAINNET;
export const STELLAR_FRIENDBOT_URL = "https://friendbot.stellar.org";

// Horizon server singletons
export const stellarTestnetServer = new StellarSdk.Horizon.Server(
  STELLAR_TESTNET_HORIZON,
);
export const stellarMainnetServer = new StellarSdk.Horizon.Server(
  STELLAR_MAINNET_HORIZON,
);

/**
 * Returns the appropriate Horizon server for the given network.
 */
export function getHorizonServer(
  network: "testnet" | "mainnet" = "testnet",
): StellarSdk.Horizon.Server {
  return network === "mainnet" ? stellarMainnetServer : stellarTestnetServer;
}

/**
 * Funds an unactivated Stellar testnet account via Friendbot.
 */
export async function fundTestnetAccount(
  publicKey: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(
      `${STELLAR_FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`,
    );
    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        message: `Friendbot returned HTTP ${res.status}: ${errText}`,
      };
    }
    return {
      success: true,
      message: "Successfully funded testnet account with 10,000 XLM",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Friendbot funding failed: ${err.message || String(err)}`,
    };
  }
}

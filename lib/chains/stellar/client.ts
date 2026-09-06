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

/**
 * Ensures a Stellar account has an active trustline for the given asset.
 * If missing, submits a changeTrust transaction on-chain automatically.
 */
export async function ensureStellarTrustline(
  keypair: StellarSdk.Keypair,
  asset: StellarSdk.Asset,
  network: "testnet" | "mainnet" = "testnet",
): Promise<boolean> {
  if (asset.isNative()) return true;

  const server = getHorizonServer(network);
  try {
    const account = await server.loadAccount(keypair.publicKey());
    const hasTrustline = account.balances.some(
      (b: any) =>
        b.asset_code === asset.getCode() &&
        b.asset_issuer === asset.getIssuer(),
    );

    if (hasTrustline) {
      return true;
    }

    console.log(
      `[Stellar Trustline] Creating missing trustline for ${asset.getCode()}:${asset.getIssuer()} on ${keypair.publicKey()}...`,
    );

    const passphrase =
      network === "mainnet"
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: passphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    console.log(
      `[Stellar Trustline] Trustline established! TxHash: ${result.hash}`,
    );
    return true;
  } catch (err) {
    console.warn("[Stellar Trustline] Error ensuring trustline:", err);
    return false;
  }
}

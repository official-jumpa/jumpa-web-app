import { migrateWalletToV3 } from "./migrate-wallet-to-v3";
import { generateTronWallet } from "./generate-tron-wallet";

interface BackgroundTasksOptions {
  walletId: string;
  userId?: string | null;
  pin: string;
  rawMnemonic?: string;
}

/**
 * Runs independent background tasks upon user PIN verification:
 * 1. Upgrades legacy wallet to v3 HKDF encryption (via lib/services/migrate-wallet-to-v3.ts)
 * 2. Generates Tron address if missing (via lib/services/generate-tron-wallet.ts)
 *
 * Each task is completely isolated and can be removed independently later
 */
export async function triggerWalletBackgroundUpdates({
  walletId,
  userId,
  pin,
  rawMnemonic,
}: BackgroundTasksOptions): Promise<void> {
  // Fire both independently in background
  void migrateWalletToV3({ walletId, userId, pin, rawMnemonic });
  void generateTronWallet({ walletId, userId, pin, rawMnemonic });
}

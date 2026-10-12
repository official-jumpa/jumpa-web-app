import { connectDB } from "@/lib/db";
import { Wallet, IWallet } from "@/models/Wallet";
import { decryptMnemonic, encryptMnemonic } from "@/lib/crypto";

interface MigrateV3Options {
  walletId: string;
  userId?: string | null;
  pin: string;
  rawMnemonic?: string;
}

/**
 * Migrates a legacy (v1/v2) wallet to Wallet v3 (HKDF server-pepper encryption).
 * Runs asynchronously in the background so the user experiences ZERO lag.
 * Can be removed once all existing wallets have migrated to v3.
 */
export async function migrateWalletToV3({
  walletId,
  userId,
  pin,
  rawMnemonic,
}: MigrateV3Options): Promise<void> {
  try {
    await connectDB();

    const query: Record<string, any> = { _id: walletId };
    if (userId) query.userId = userId;

    const wallet: IWallet | null = await Wallet.findOne(query);
    if (!wallet || wallet.pinVersion === "v3") {
      return; // Already v3 or not found
    }

    let mnemonic = rawMnemonic;
    if (!mnemonic) {
      try {
        mnemonic = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          pin,
          wallet.pinVersion,
        );
      } catch (err) {
        console.error(`[MigrateV3] Decryption failed for wallet ${walletId}:`, err);
        return;
      }
    }

    if (!mnemonic) return;

    const { encryptedMnemonic, iv, salt } = encryptMnemonic(mnemonic);
    await Wallet.updateOne(
      { _id: walletId },
      {
        $set: {
          encryptedMnemonic,
          iv,
          salt,
          pinVersion: "v3",
        },
      },
    );

    console.log(`[MigrateV3] ✅ Wallet ${walletId} upgraded to pinVersion v3`);
  } catch (err) {
    console.error(`[MigrateV3] Unexpected error for wallet ${walletId}:`, err);
  }
}

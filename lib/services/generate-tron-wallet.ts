import { connectDB } from "@/lib/db";
import { Wallet, IWallet } from "@/models/Wallet";
import { decryptMnemonic } from "@/lib/crypto";
import { deriveTronAddress } from "@/lib/chains/tron/derivation";
import * as bip39 from "bip39";

interface BackfillTronOptions {
  walletId: string;
  userId?: string | null;
  pin?: string;
  rawMnemonic?: string;
}

/**
 * Generates a Tron address (addresses.trx and publicKeys.trx) for an existing wallet if missing.
 * Runs asynchronously in the background so the user experiences ZERO lag.
 * Can be removed once all existing wallets have a Tron address generated.
 */
export async function generateTronWallet({
  walletId,
  userId,
  pin,
  rawMnemonic,
}: BackfillTronOptions): Promise<void> {
  try {
    await connectDB();

    const query: Record<string, any> = { _id: walletId };
    if (userId) query.userId = userId;

    const wallet: IWallet | null = await Wallet.findOne(query);
    if (!wallet || wallet.addresses?.trx) {
      return; // Already has Tron or not found
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
        console.error(`[BackfillTron] Decryption failed for wallet ${walletId}:`, err);
        return;
      }
    }

    if (!mnemonic) return;

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const tronKeys = deriveTronAddress(seed);

    await Wallet.updateOne(
      { _id: walletId },
      {
        $set: {
          "addresses.trx": tronKeys.address,
          "publicKeys.trx": tronKeys.publicKey,
        },
      },
    );

    console.log(`[BackfillTron] ✅ Derived Tron address for wallet ${walletId}: ${tronKeys.address}`);
  } catch (err) {
    console.error(`[BackfillTron] Unexpected error for wallet ${walletId}:`, err);
  }
}

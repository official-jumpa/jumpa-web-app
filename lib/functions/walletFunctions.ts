import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Wallet, type IWallet } from "@/models/Wallet";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const pinAttempts = new Map<string, { count: number; lockedUntil?: number }>();

/**
 * Finds a user's wallet. If a specific address is provided, finds by that address.
 * Otherwise returns the first active wallet for the user.
 */
export async function findWalletForUser(
  userId: string,
  targetAddress?: string,
): Promise<IWallet | null> {
  await connectDB();

  if (targetAddress) {
    const direct = await Wallet.findOne({
      userId,
      address: targetAddress.toLowerCase(),
    });
    if (direct) return direct;
  }

  return Wallet.findOne({ userId });
}

/**
 * Finds any wallet by primary address (case-insensitive).
 */
export async function findWalletByAddress(
  address: string,
): Promise<IWallet | null> {
  await connectDB();
  return Wallet.findOne({ address: address.toLowerCase() });
}

/**
 * Lists all wallets belonging to a user.
 */
export async function listWalletsByUserId(userId: string): Promise<IWallet[]> {
  await connectDB();
  return Wallet.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Computes the next sequential wallet name for a user (Wallet 1, Wallet 2...).
 */
export async function getNextWalletName(userId: string): Promise<string> {
  const wallets = await listWalletsByUserId(userId);
  const existingNames = wallets.map((w) => w.name);
  let walletIndex = 1;
  while (existingNames.includes(`Wallet ${walletIndex}`)) {
    walletIndex++;
  }
  return `Wallet ${walletIndex}`;
}

/**
 * Renames a wallet owned by the user, ensuring unique names across their wallets.
 */
export async function renameUserWallet(
  userId: string,
  address: string,
  newName: string,
): Promise<{ success: boolean; wallet?: IWallet; error?: string }> {
  await connectDB();
  const wallet = await Wallet.findOne({
    userId,
    address: address.toLowerCase(),
  });
  if (!wallet) {
    return { success: false, error: "Wallet not found or not owned by user" };
  }

  const duplicate = await Wallet.findOne({
    userId,
    name: { $regex: new RegExp(`^${newName.trim()}$`, "i") },
    address: { $ne: address.toLowerCase() },
  });

  if (duplicate) {
    return { success: false, error: "A wallet with this name already exists" };
  }

  wallet.name = newName.trim();
  await wallet.save();
  return { success: true, wallet };
}

/**
 * Creates a new wallet record.
 */

export async function createWalletRecord(
  data: Partial<IWallet>,
): Promise<IWallet> {
  await connectDB();
  return Wallet.create(data);
}

/**
 * Updates a wallet's last used timestamp.
 */
export async function updateWalletLastUsed(walletId: string): Promise<void> {
  await connectDB();
  await Wallet.findByIdAndUpdate(walletId, {
    $set: { lastUsedAt: new Date() },
  });
}

/**
 * Verifies a user's wallet PIN with rate-limiting and lockout protection.
 */
export async function verifyWalletPinAndLockout(
  userId: string,
  pin: string,
  targetAddress?: string,
): Promise<{
  valid: boolean;
  wallet?: IWallet;
  error?: string;
  statusCode?: number;
}> {
  const lockKey = `${userId}:${targetAddress || "default"}`;
  const now = Date.now();
  const attempt = pinAttempts.get(lockKey);

  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
    return {
      valid: false,
      error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
      statusCode: 429,
    };
  }

  const wallet = await findWalletForUser(userId, targetAddress);
  if (!wallet) {
    return {
      valid: false,
      error: "No wallet found for user",
      statusCode: 404,
    };
  }

  const isValid = await bcrypt.compare(pin, wallet.pinHash);

  if (!isValid) {
    const currentCount = (attempt?.count || 0) + 1;
    if (currentCount >= MAX_ATTEMPTS) {
      pinAttempts.set(lockKey, {
        count: currentCount,
        lockedUntil: now + LOCKOUT_MS,
      });
      return {
        valid: false,
        error: "Too many failed attempts. Try again in 15 minutes.",
        statusCode: 429,
      };
    }

    pinAttempts.set(lockKey, { count: currentCount });
    return {
      valid: false,
      error: "Incorrect PIN",
      statusCode: 401,
    };
  }

  // Clear failed attempts on success
  pinAttempts.delete(lockKey);

  return {
    valid: true,
    wallet,
  };
}

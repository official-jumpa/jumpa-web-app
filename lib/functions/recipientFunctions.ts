import { connectDB } from "@/lib/db";
import { normaliseTag } from "@/lib/sign-up";
import { normalizeEmail } from "@/lib/utils/email-policy";
import { isValidNigerianPhone } from "@/lib/validations/bills.validation";
import { formatToCanonicalNigerianPhone } from "@/lib/functions/kycFunctions";
import { type IUser, User } from "@/models/User";
import { type IWallet, Wallet } from "@/models/Wallet";
import type { JumpaRecipient } from "@/lib/jumpa-send";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVM = /^0x[a-fA-F0-9]{40}$/;
const STELLAR = /^G[A-Z2-7]{55}$/;
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

/** Wallet fields an address can match, in the casing each one is stored in. */
function addressFilter(raw: string) {
  if (EVM.test(raw)) {
    const lower = raw.toLowerCase();
    return { $or: [{ "addresses.eth": lower }, { "addresses.base": lower }, { address: lower }] };
  }
  if (STELLAR.test(raw)) return { "addresses.xlm": raw };
  if (TRON.test(raw)) return { "addresses.trx": raw };
  if (SOLANA.test(raw)) return { "addresses.sol": raw };
  return null;
}

/** Tag, email, Nigerian phone or wallet address → the user it belongs to. */
async function findUser(query: string): Promise<IUser | null> {
  const raw = query.trim();
  if (!raw) return null;

  const byAddress = addressFilter(raw);
  if (byAddress) {
    const wallet = await Wallet.findOne(byAddress).lean<IWallet>();
    return wallet?.userId ? User.findById(wallet.userId).lean<IUser>() : null;
  }
  if (EMAIL.test(raw)) {
    return User.findOne({ email: normalizeEmail(raw) }).lean<IUser>();
  }
  if (isValidNigerianPhone(raw)) {
    return User.findOne({
      phoneNumber: formatToCanonicalNigerianPhone(raw),
    }).lean<IUser>();
  }

  // Tags are stored as "<handle>@jumpa"; older rows carry the bare handle.
  const tag = normaliseTag(raw.replace(/@jumpa$/i, ""));
  return tag
    ? User.findOne({ jumpaTag: { $in: [`${tag}@jumpa`, tag] } }).lean<IUser>()
    : null;
}

/**
 * Resolves who a Jumpa transfer goes to. Never returns the caller or an account
 * that cannot receive (suspended, banned, deleted, or without a wallet).
 */
export async function findJumpaRecipient(
  query: string,
  callerId: string,
): Promise<JumpaRecipient | null> {
  await connectDB();
  const user = await findUser(query);
  if (!user || String(user._id) === callerId) return null;
  if (user.status !== "active" || user.deletedAt) return null;

  const wallet = await Wallet.findOne({ userId: String(user._id) })
    .sort({ lastUsedAt: -1, createdAt: 1 })
    .lean<IWallet>();
  if (!wallet) return null;

  const tag = user.jumpaTag ? user.jumpaTag.replace(/@jumpa$/i, "") : null;
  const name = user.nickname || user.name || tag || "Jumpa user";
  return {
    name,
    tag,
    image: user.image ?? null,
    addresses: {
      stellar: wallet.addresses.xlm || undefined,
      solana: wallet.addresses.sol || undefined,
      base: wallet.addresses.base || undefined,
      eth: wallet.addresses.eth || undefined,
      tron: wallet.addresses.trx || undefined,
    },
  };
}

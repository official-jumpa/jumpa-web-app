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

/** Most suggestions the recipient field shows at once. */
const MAX_MATCHES = 6;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wallet-backed, active accounts only, in the order the ids were given. */
async function toRecipients(users: IUser[], callerId: string): Promise<JumpaRecipient[]> {
  const eligible = users.filter(
    (user) => String(user._id) !== callerId && user.status === "active" && !user.deletedAt,
  );
  if (eligible.length === 0) return [];

  const wallets = await Wallet.find({ userId: { $in: eligible.map((user) => String(user._id)) } })
    .sort({ lastUsedAt: -1, createdAt: 1 })
    .lean<IWallet[]>();
  // The first wallet per user wins, which the sort makes the most recently used.
  const walletOf = new Map<string, IWallet>();
  for (const wallet of wallets) {
    if (wallet.userId && !walletOf.has(wallet.userId)) walletOf.set(wallet.userId, wallet);
  }

  return eligible.flatMap((user) => {
    const wallet = walletOf.get(String(user._id));
    if (!wallet) return [];
    const tag = user.jumpaTag ? user.jumpaTag.replace(/@jumpa$/i, "") : null;
    return [
      {
        name: user.nickname || user.name || tag || "Jumpa user",
        tag,
        image: user.image ?? null,
        addresses: {
          stellar: wallet.addresses.xlm || undefined,
          solana: wallet.addresses.sol || undefined,
          base: wallet.addresses.base || undefined,
          eth: wallet.addresses.eth || undefined,
          tron: wallet.addresses.trx || undefined,
        },
      },
    ];
  });
}

/**
 * Who a Jumpa transfer can go to. An email, phone or wallet address resolves
 * exactly; anything else is a tag or name and returns suggestions whose tag,
 * or a word of whose name, starts with it, an exact tag first. Never includes
 * the caller or an account that cannot receive.
 */
export async function findJumpaRecipients(query: string, callerId: string): Promise<JumpaRecipient[]> {
  await connectDB();
  const raw = query.trim();
  if (!raw) return [];

  if (addressFilter(raw) || EMAIL.test(raw) || isValidNigerianPhone(raw)) {
    const user = await findUser(raw);
    return user ? toRecipients([user], callerId) : [];
  }

  const tag = normaliseTag(raw.replace(/@jumpa$/i, ""));
  const words = raw.replace(/^@+/, "").replace(/@jumpa$/i, "").trim();
  if (!tag && !words) return [];

  const or: Record<string, unknown>[] = [];
  // Tags are stored lowercase, so an anchored, case-sensitive prefix can use the index.
  if (tag) or.push({ jumpaTag: { $regex: `^${escapeRegex(tag)}` } });
  if (words) {
    const name = { $regex: `(^|\\s)${escapeRegex(words)}`, $options: "i" };
    or.push({ name }, { nickname: name });
  }

  const users = await User.find({ $or: or, status: "active", deletedAt: null })
    .limit(MAX_MATCHES * 2)
    .lean<IUser[]>();

  const handle = (user: IUser) => (user.jumpaTag ?? "").replace(/@jumpa$/i, "");
  const rank = (user: IUser) => {
    const own = handle(user);
    if (own === tag) return 0;
    if (tag && own.startsWith(tag)) return 1 + own.length / 100;
    return 2;
  };
  users.sort((a, b) => rank(a) - rank(b));

  return (await toRecipients(users, callerId)).slice(0, MAX_MATCHES);
}

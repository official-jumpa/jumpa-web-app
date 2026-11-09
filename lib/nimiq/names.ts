import { type Address, getAddress, type Hex } from "viem";
import { connectDB } from "@/lib/db";
import {
  normaliseTag,
  TAG_MIN_LENGTH,
  type TagAvailability,
} from "@/lib/sign-up";
import { NimiqName } from "@/models/NimiqName";
import { User } from "@/models/User";
import { OrderError } from "./orders";
import {
  TAG_CLAIM_SKEW_SECONDS,
  TAG_CLAIM_TTL_SECONDS,
  verifyTagClaim,
} from "./tag-claim";

/** Handles nobody may claim from the mini app. */
const RESERVED = new Set(["jumpa", "admin", "support", "nimiq"]);
const SUFFIX = "@jumpa";
const TAKEN = "That Jumpa tag is already taken";

export type NameDeps = { now: () => number; connect: () => Promise<unknown> };

const defaultDeps: NameDeps = { now: Date.now, connect: connectDB };

/** `ada`, `@ada` and `ada@jumpa` are all the handle `ada`. */
export const handleOf = (input: string) =>
  normaliseTag(input.trim().replace(/@jumpa$/i, ""));

export const fullTag = (handle: string) => `${handle}${SUFFIX}`;

export type TagStatus = TagAvailability & {
  tag: string;
  /** The Nimiq Pay wallet that holds it; null when it is free or a Jumpa account's. */
  address: Address | null;
};

/** One tag is one person: a handle held by a Jumpa account is taken here too. */
async function takenHandles(handles: string[]): Promise<Set<string>> {
  const [names, users] = await Promise.all([
    NimiqName.find({ _id: { $in: handles } }, { _id: 1 }).lean(),
    // Older accounts store the bare handle.
    User.find(
      { jumpaTag: { $in: handles.flatMap((h) => [fullTag(h), h]) } },
      { jumpaTag: 1 },
    ).lean(),
  ]);
  return new Set([
    ...handles.filter((handle) => RESERVED.has(handle)),
    ...names.map((name) => name._id),
    ...users.map((user) => handleOf(user.jumpaTag ?? "")),
  ]);
}

/** Whether a handle is free, which wallet holds it, and free ones close to it. */
export async function tagStatus(
  input: string,
  deps: NameDeps = defaultDeps,
): Promise<TagStatus> {
  const handle = handleOf(input);
  const tag = fullTag(handle);
  if (handle.length < TAG_MIN_LENGTH) {
    return { tag, address: null, available: false, suggestions: [] };
  }
  await deps.connect();
  const options = [
    ...new Set(
      [handle, `${handle}_`, `${handle}1`, `the${handle}`].map(normaliseTag),
    ),
  ];
  const [taken, holder] = await Promise.all([
    takenHandles(options),
    NimiqName.findById(handle).lean(),
  ]);
  const address = holder ? getAddress(holder.walletAddress) : null;
  if (!taken.has(handle)) {
    return { tag, address, available: true, suggestions: [] };
  }
  return {
    tag,
    address,
    available: false,
    suggestions: options
      .filter((option) => option !== handle && !taken.has(option))
      .slice(0, 3),
  };
}

/** True when a Nimiq Pay wallet holds this handle; the main app checks it before claiming. */
export async function isNimiqHandle(handle: string): Promise<boolean> {
  await connectDB();
  return Boolean(await NimiqName.exists({ _id: handleOf(handle) }));
}

/** The tag this wallet claimed, if any. */
export async function tagOfWallet(
  address: Address,
  deps: NameDeps = defaultDeps,
): Promise<string | null> {
  await deps.connect();
  const row = await NimiqName.findOne({
    walletAddress: getAddress(address),
  }).lean();
  return row ? fullTag(row._id) : null;
}

export type TagClaimInput = {
  address: Address;
  tag: string;
  /** Unix seconds the wallet signed at. */
  issuedAt: number;
  signature: Hex;
};

const isDuplicateKey = (error: unknown) =>
  (error as { code?: unknown } | null)?.code === 11000;

/** Saves a tag for a wallet that signed for it. A tag, once set, stays, as in the main app. */
export async function claimTag(
  input: TagClaimInput,
  deps: NameDeps = defaultDeps,
): Promise<{ tag: string }> {
  const handle = handleOf(input.tag);
  if (handle.length < TAG_MIN_LENGTH) {
    throw new OrderError(
      `Your tag needs at least ${TAG_MIN_LENGTH} characters`,
      400,
    );
  }
  const age = deps.now() / 1000 - input.issuedAt;
  if (age > TAG_CLAIM_TTL_SECONDS || age < -TAG_CLAIM_SKEW_SECONDS) {
    throw new OrderError("That approval has expired. Try again.", 400);
  }
  const wallet = getAddress(input.address);
  const signed = await verifyTagClaim(
    { wallet, handle, issuedAt: input.issuedAt },
    input.signature,
  );
  if (!signed) {
    throw new OrderError("Nimiq Pay didn't approve this tag.", 400);
  }

  await deps.connect();
  if (await NimiqName.exists({ walletAddress: wallet })) {
    throw new OrderError("Your wallet already has a Jumpa tag.", 409);
  }
  if ((await takenHandles([handle])).has(handle)) {
    throw new OrderError(TAKEN, 409);
  }
  try {
    await NimiqName.create({ _id: handle, walletAddress: wallet });
  } catch (error) {
    // Lost a race to the same handle or a second claim from this wallet.
    if (isDuplicateKey(error)) throw new OrderError(TAKEN, 409);
    throw error;
  }
  return { tag: fullTag(handle) };
}

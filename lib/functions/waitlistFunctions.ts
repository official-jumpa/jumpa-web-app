import { connectDB } from "@/lib/db";
import { Waitlist, type IWaitlist } from "@/models/Waitlist";
import { generateId } from "@/lib/schema-ids";
import type { JoinWaitlistInput } from "@/lib/validations/waitlist.validation";

export interface JoinWaitlistResult {
  isNew: boolean;
  waitlist: IWaitlist;
  position: number;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  headerReferer?: string;
}

/**
 * Calculates a user's position in the waitlist queue based on createdAt.
 */
export async function getWaitlistPosition(createdAt: Date): Promise<number> {
  await connectDB();
  const countAhead = await Waitlist.countDocuments({
    createdAt: { $lte: createdAt },
  });
  return countAhead;
}

/**
 * Retrieves a waitlist entry by email.
 */
export async function getWaitlistEntry(
  email: string,
): Promise<IWaitlist | null> {
  await connectDB();
  const normalizedEmail = email.trim().toLowerCase();
  return Waitlist.findOne({ email: normalizedEmail }).lean<IWaitlist>();
}

/**
 * Adds a user to the waitlist or returns their existing entry.
 */
export async function joinWaitlist(
  input: JoinWaitlistInput,
  meta?: RequestMetadata,
): Promise<JoinWaitlistResult> {
  await connectDB();

  const normalizedEmail = input.email.trim().toLowerCase();

  // Check for existing entry
  const existing = await Waitlist.findOne({ email: normalizedEmail }).lean<IWaitlist>();
  if (existing) {
    const position = await getWaitlistPosition(existing.createdAt);
    return {
      isNew: false,
      waitlist: existing,
      position,
    };
  }

  // Derive referrer: client input takes precedence, falls back to HTTP referer header
  const resolvedReferrer = input.referrer || meta?.headerReferer || undefined;

  const newEntry = await Waitlist.create({
    _id: generateId("wait"),
    email: normalizedEmail,
    name: input.name,
    source: input.source || "landing",
    referrer: resolvedReferrer,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    referralCode: input.referralCode,
    metadata: input.metadata,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  const position = await getWaitlistPosition(newEntry.createdAt);

  return {
    isNew: true,
    waitlist: newEntry.toObject ? newEntry.toObject() : newEntry,
    position,
  };
}

/**
 * Returns overall waitlist metrics.
 */
export async function getWaitlistStats(): Promise<{ total: number }> {
  await connectDB();
  const total = await Waitlist.countDocuments();
  return { total };
}

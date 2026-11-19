import { connectDB } from "@/lib/db";
import {
  GasSponsorship,
  type GasSponsorshipStatus,
  type IGasSponsorship,
} from "@/models/GasSponsorship";

export type SponsorshipRecord = Pick<
  IGasSponsorship,
  "_id" | "status" | "topUpTxHash" | "feeTxHash" | "feeRaw" | "updatedAt"
>;

export type NewSponsorship = Pick<
  IGasSponsorship,
  | "userId"
  | "chain"
  | "address"
  | "topUpTxHash"
  | "topUpSun"
  | "costSun"
  | "feeRaw"
>;

export type SponsorshipPatch = Partial<
  Pick<IGasSponsorship, "status" | "feeTxHash" | "transferTxHash">
>;

/** The state a record must still be in for an update to apply, so two requests can't both move it. */
export type SponsorshipExpect = {
  status: GasSponsorshipStatus;
  feeTxHash?: string | null;
};

/** Where sponsored top-ups and the fees owed for them are kept; tests swap in an in-memory one. */
export interface GasSponsorshipStore {
  /** Saved as TOPPING_UP before the top-up is broadcast, so a crash can't lose it; null if the user already has one open. */
  create(record: NewSponsorship): Promise<string | null>;
  /** Returns how many records changed. */
  update(
    ids: string[],
    patch: SponsorshipPatch,
    expect?: SponsorshipExpect,
  ): Promise<number>;
  /** Records still in flight or owed: TOPPING_UP, OWED and COLLECTING. */
  unsettled(
    userId: string,
    chain: IGasSponsorship["chain"],
  ): Promise<SponsorshipRecord[]>;
}

export const gasSponsorshipStore: GasSponsorshipStore = {
  async create(record) {
    await connectDB();
    try {
      const doc = await GasSponsorship.create({
        ...record,
        status: "TOPPING_UP",
        open: true,
      });
      return doc._id;
    } catch (err) {
      // The one-open-record-per-user index: another send already holds it.
      if ((err as { code?: number }).code === 11000) return null;
      throw err;
    }
  },

  async update(ids, patch, expect) {
    if (!ids.length) return 0;
    await connectDB();
    // A settled record frees the user's open slot.
    const settled = patch.status === "PAID" || patch.status === "CANCELLED";
    const res = await GasSponsorship.updateMany(
      { _id: { $in: ids }, ...expect },
      settled ? { $set: patch, $unset: { open: 1 } } : { $set: patch },
    );
    return res.modifiedCount;
  },

  async unsettled(userId, chain) {
    await connectDB();
    return GasSponsorship.find({
      userId,
      chain,
      status: { $in: ["TOPPING_UP", "OWED", "COLLECTING"] },
    })
      .select("_id status topUpTxHash feeTxHash feeRaw updatedAt")
      .lean<SponsorshipRecord[]>();
  },
};

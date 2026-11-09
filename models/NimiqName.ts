import mongoose, { type Model, Schema } from "mongoose";

/** A Jumpa tag claimed by a Nimiq Pay wallet. `_id` is the handle, without `@jumpa`. */
export interface INimiqName {
  _id: string;
  /** Checksummed Polygon address; one tag per wallet. */
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const NimiqNameSchema = new Schema<INimiqName>(
  {
    _id: { type: String, required: true },
    walletAddress: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: "nimiq_names" },
);

export const NimiqName: Model<INimiqName> =
  mongoose.models.NimiqName ||
  mongoose.model<INimiqName>("NimiqName", NimiqNameSchema);

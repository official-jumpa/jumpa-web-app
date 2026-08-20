import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string; // Better-Auth uses custom generated string IDs (e.g. USER_...)
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, default: null },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, required: true, default: false },
    image: { type: String, default: null },
  },
  {
    timestamps: true,
    _id: false, // Prevent mongoose from auto-generating id
    collection: "user", // match MongoDB collection name for Better-Auth
  },
);

export const User =
  (models.User as mongoose.Model<IUser>) ?? model<IUser>("User", UserSchema);

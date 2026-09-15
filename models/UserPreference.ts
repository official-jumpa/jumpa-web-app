import mongoose, { Schema, model, models } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export interface IUserPreference {
  _id: string;
  userId: string;
  pushNotifications: boolean;
  emailNotifications: boolean;
  newLoginDetected: boolean;
  haptics: boolean;
  inAppSounds: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    _id: { type: String, default: () => generateId("pref") },
    userId: { type: String, required: true, unique: true, index: true },
    pushNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    newLoginDetected: { type: Boolean, default: true },
    haptics: { type: Boolean, default: true },
    inAppSounds: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    _id: false,
  },
);

export const UserPreference =
  (models.UserPreference as mongoose.Model<IUserPreference>) ??
  model<IUserPreference>("UserPreference", UserPreferenceSchema);
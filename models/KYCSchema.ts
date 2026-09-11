import type mongoose from "mongoose";
import { model, models, Schema } from "mongoose";
import { generateId } from "@/lib/schema-ids";

export type KycStatus =
  | "not_started"
  | "in_progress"
  | "pending"
  | "approved"
  | "rejected"
  | "failed";

export type KycStage =
  | "intro"
  | "tasks"
  | "doc-select"
  | "document"
  | "selfie"
  | "verifying"
  | "completed"
  | "failed";

export type KycIdType = "nin" | "licence" | "passport";

export interface IKycDetails {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: "m" | "f" | "other" | string | null;
  phone?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  nationality?: string | null;
  photoUrl?: string | null; // Official government photo returned by verification
  dataMatch?: boolean;
  facialMatchConfidence?: number | null;
}

export interface IKYCSchema {
  _id: string;
  userId: string;

  // Completion indicator & high-level status
  isCompleted: boolean;
  status: KycStatus;

  // Flow Stage Tracking
  stage: KycStage;
  currentStep: number;
  stepsCompleted: { document: boolean; selfie: boolean; verification: boolean };

  // Uploaded Document & Media Details
  idType?: KycIdType | null;
  idNumber?: string | null;
  docMediaId?: string | null;
  selfieMediaId?: string | null;
  docPhotoUrl?: string | null;
  selfiePhotoUrl?: string | null;

  // Extracted/Verified Details once KYC is completed
  details?: IKycDetails | null;

  // Provider & Audit Information
  provider: string; // e.g. "myaza"
  verificationId?: string | null;
  rejectionReason?: string | null;
  rawResponse?: Record<string, unknown> | null;
  submittedAt?: Date | null;
  completedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const KycSchema = new Schema<IKYCSchema>(
  {
    _id: { type: String, default: () => generateId("kyc") },
    userId: { type: String, required: true, unique: true, index: true },

    // Completion indicator & high-level status
    isCompleted: { type: Boolean, required: true, default: false, index: true },
    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "pending",
        "approved",
        "rejected",
        "failed",
      ],
      default: "not_started",
      index: true,
    },

    // Flow Stage Tracking
    stage: {
      type: String,
      enum: [
        "intro",
        "tasks",
        "doc-select",
        "document",
        "selfie",
        "verifying",
        "completed",
        "failed",
      ],
      default: "intro",
    },
    currentStep: { type: Number, default: 1 },
    stepsCompleted: {
      document: { type: Boolean, default: false },
      selfie: { type: Boolean, default: false },
      verification: { type: Boolean, default: false },
    },

    // Uploaded Document & Media Details
    idType: {
      type: String,
      enum: ["nin", "licence", "passport", null],
      default: null,
    },
    idNumber: { type: String, default: null },
    docMediaId: { type: String, default: null },
    selfieMediaId: { type: String, default: null },
    docPhotoUrl: { type: String, default: null },
    selfiePhotoUrl: { type: String, default: null },

    // Extracted/Verified Details once KYC is completed
    details: {
      firstName: { type: String, default: null },
      middleName: { type: String, default: null },
      lastName: { type: String, default: null },
      fullName: { type: String, default: null },
      dateOfBirth: { type: String, default: null },
      gender: { type: String, default: null },
      phone: { type: String, default: null },
      address: {
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        postalCode: { type: String, default: null },
        country: { type: String, default: null },
      },
      nationality: { type: String, default: null },
      photoUrl: { type: String, default: null },
      dataMatch: { type: Boolean, default: false },
      facialMatchConfidence: { type: Number, default: null },
    },

    // Provider & Audit Information
    provider: { type: String, default: "myaza" },
    verificationId: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    rawResponse: { type: Schema.Types.Mixed, default: null },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false, collection: "kyc" },
);

KycSchema.index({ userId: 1, isCompleted: 1 });
KycSchema.index({ status: 1, stage: 1 });

export const KYCSchema =
  (models.KYCSchema as mongoose.Model<IKYCSchema>) ??
  model<IKYCSchema>("KYCSchema", KycSchema);

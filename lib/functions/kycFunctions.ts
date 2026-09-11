import { connectDB } from "@/lib/db";
import {
  type IKYCSchema,
  type IKycDetails,
  KYCSchema,
  type KycIdType,
  type KycStage,
  type KycStatus,
} from "@/models/KYCSchema";
import { User } from "@/models/User";

/**
 * Retrieves the user's KYC record by user ID.
 */
export async function getKycRecordByUserId(
  userId: string,
): Promise<IKYCSchema | null> {
  await connectDB();
  const record = await KYCSchema.findOne({ userId }).lean<IKYCSchema>();
  return record ?? null;
}

/**
 * Retrieves the user's KYC record, or initializes a new one if none exists.
 */
export async function getOrCreateKycRecord(
  userId: string,
): Promise<IKYCSchema> {
  await connectDB();
  let record = await KYCSchema.findOne({ userId });

  if (!record) {
    record = await KYCSchema.create({
      userId,
      isCompleted: false,
      status: "not_started",
      stage: "intro",
      currentStep: 1,
      stepsCompleted: { document: false, selfie: false, verification: false },
      provider: "myaza",
    });
  }

  return record.toObject();
}

/**
 * Updates the user's current KYC flow stage and step number.
 */
export async function updateKycStage(
  userId: string,
  stage: KycStage,
  currentStep?: number,
): Promise<IKYCSchema | null> {
  await connectDB();

  const update: Record<string, unknown> = { stage };
  if (currentStep !== undefined) {
    update.currentStep = currentStep;
  }
  if (stage !== "intro" && stage !== "completed" && stage !== "failed") {
    update.status = "in_progress";
  }

  const updated = await KYCSchema.findOneAndUpdate(
    { userId },
    { $set: update },
    { returnDocument: "after", upsert: true, runValidators: true },
  ).lean<IKYCSchema>();

  return updated ?? null;
}

/**
 * Saves uploaded document or selfie media IDs into the user's KYC record.
 */
export async function saveKycMedia(
  userId: string,
  params: {
    type: "document" | "selfie";
    mediaId: string;
    idType?: KycIdType | null;
    idNumber?: string | null;
    docPhotoUrl?: string | null;
    selfiePhotoUrl?: string | null;
  },
): Promise<IKYCSchema | null> {
  await connectDB();

  const update: Record<string, unknown> = { status: "in_progress" };

  if (params.type === "document") {
    update.docMediaId = params.mediaId;
    update["stepsCompleted.document"] = true;
    if (params.idType) update.idType = params.idType;
    if (params.idNumber) update.idNumber = params.idNumber;
    if (params.docPhotoUrl) update.docPhotoUrl = params.docPhotoUrl;
  } else if (params.type === "selfie") {
    update.selfieMediaId = params.mediaId;
    update["stepsCompleted.selfie"] = true;
    if (params.selfiePhotoUrl) update.selfiePhotoUrl = params.selfiePhotoUrl;
  }

  const updated = await KYCSchema.findOneAndUpdate(
    { userId },
    { $set: update },
    { returnDocument: "after", upsert: true, runValidators: true },
  ).lean<IKYCSchema>();

  return updated ?? null;
}

/**
 * Finalizes KYC verification after provider API verification succeeds or fails.
 */
export async function completeKycVerification(
  userId: string,
  params: {
    verificationId?: string | null;
    status: KycStatus;
    isCompleted: boolean;
    stage?: KycStage;
    details?: IKycDetails | null;
    rawResponse?: Record<string, unknown> | null;
    rejectionReason?: string | null;
  },
): Promise<IKYCSchema | null> {
  await connectDB();

  const update: Record<string, unknown> = {
    status: params.status,
    isCompleted: params.isCompleted,
    stage: params.stage ?? (params.isCompleted ? "completed" : "failed"),
    "stepsCompleted.verification": params.isCompleted,
  };

  if (params.verificationId) update.verificationId = params.verificationId;
  if (params.details) update.details = params.details;
  if (params.rawResponse) update.rawResponse = params.rawResponse;
  if (params.rejectionReason) update.rejectionReason = params.rejectionReason;

  if (params.isCompleted) {
    update.completedAt = new Date();
  }

  const updated = await KYCSchema.findOneAndUpdate(
    { userId },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  ).lean<IKYCSchema>();

  return updated ?? null;
}

/**
 * Syncs verified KYC biodata (e.g. Full Name, Country) back to the primary User model.
 */
export async function syncKycToUserProfile(
  userId: string,
  details: IKycDetails,
): Promise<void> {
  await connectDB();

  const userUpdates: Record<string, unknown> = {};

  if (details.fullName) {
    userUpdates.name = details.fullName;
  } else if (details.firstName || details.lastName) {
    const parts = [details.firstName, details.middleName, details.lastName]
      .filter(Boolean)
      .join(" ");
    if (parts) userUpdates.name = parts;
  }

  if (details.nationality) {
    userUpdates.country = details.nationality;
  } else if (details.address?.country) {
    userUpdates.country = details.address.country;
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userId, { $set: userUpdates });
  }
}

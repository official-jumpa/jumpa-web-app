import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { recordUserActivity } from "@/lib/functions/userFunctions";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";
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

/**
 * Checks whether a phone number is a valid Nigerian phone number.
 */
export function isNigerianPhoneNumber(input: string): boolean {
  if (!input) return false;
  const cleaned = input.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+") && !cleaned.startsWith("+234")) {
    return false;
  }
  if (cleaned.startsWith("00")) {
    return false;
  }

  return isValidNigerianPhone(cleaned);
}

/**
 * Normalizes phone number to canonical E.164 (+234...) format.
 */
export function formatToCanonicalNigerianPhone(input: string): string {
  const normalized = normalizeNigerianPhone(input);
  return `+234${normalized.slice(1)}`;
}

/**
 * Sends a phone verification SMS OTP via Myaza Trust KYC REST API.
 */
export async function sendMyazaPhoneOtp(params: { phone: string }): Promise<{
  success: boolean;
  challengeId: string;
  expiresAt?: string;
  deliveryChannel?: string;
  phone: string;
}> {
  const rawPhone = params.phone.trim();
  if (!isNigerianPhoneNumber(rawPhone)) {
    throw new Error(
      "Phone number verification is currently supported in Nigeria only (+234)",
    );
  }

  const canonicalPhone = formatToCanonicalNigerianPhone(rawPhone);
  const apiKey =
    process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
  const baseUrl =
    process.env.MYAZA_TRUST_BASE_URL || "https://trust.myaza.app/api/kyc";

  if (!apiKey) {
    throw new Error(" API key is not configured");
  }

  console.log(
    `[Myaza Phone OTP] Sending to ${canonicalPhone} via ${baseUrl}/contact/send`,
  );

  const res = await fetch(`${baseUrl}/contact/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "phone",
      destination: canonicalPhone,
      codeLength: 6,
      via: "sms",
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.challengeId) {
    const errorMsg =
      data?.error || data?.message || "Failed to dispatch verification code";
    console.error("[Myaza Phone OTP Send] Error:", errorMsg, data);
    throw new Error(errorMsg);
  }

  console.log(
    `[Myaza Phone OTP] Dispatched challenge ${data.challengeId}, deliveryChannel: ${data.deliveryChannel}`,
  );

  return {
    success: true,
    challengeId: data.challengeId,
    expiresAt: data.expiresAt,
    deliveryChannel: data.deliveryChannel,
    phone: canonicalPhone,
  };
}

/**
 * Checks a phone verification OTP code with Myaza Trust KYC API and updates the user record.
 */
export async function verifyMyazaPhoneOtp(params: {
  phone: string;
  code: string;
  challengeId: string;
  userId: string;
}): Promise<{
  success: boolean;
  verified: boolean;
  phone: string;
  token?: string;
}> {
  const { phone, code, challengeId, userId } = params;

  if (!challengeId?.trim()) {
    throw new Error(
      "Missing verification challenge. Please request a new code.",
    );
  }
  if (!code?.trim()) {
    throw new Error("Please enter the verification code");
  }

  const canonicalPhone = formatToCanonicalNigerianPhone(phone);
  const apiKey =
    process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
  const baseUrl =
    process.env.MYAZA_TRUST_BASE_URL || "https://trust.myaza.app/api/kyc";

  if (!apiKey) {
    throw new Error("API key is not configured");
  }

  console.log(`[Myaza Phone OTP] Verifying code for challenge ${challengeId}`);

  const res = await fetch(`${baseUrl}/contact/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challengeId: challengeId.trim(),
      code: code.trim(),
      country: "NG",
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.verified) {
    const errorMsg =
      data?.error === "invalid_code"
        ? `Invalid code.${typeof data?.attemptsRemaining === "number" ? ` ${data.attemptsRemaining} attempt(s) remaining.` : ""}`
        : data?.error || data?.message || "Verification code failed";
    console.error("[Myaza Phone OTP Check] Error:", errorMsg, data);
    throw new Error(errorMsg);
  }

  await connectDB();

  // Update primary User record
  await User.findByIdAndUpdate(userId, {
    $set: {
      phoneNumber: canonicalPhone,
      phoneNumberVerified: true,
    },
  });

  // Log user activity
  await recordUserActivity({
    userId,
    action: "PHONE_NUMBER_VERIFIED",
    details: { phone: canonicalPhone, provider: "myaza_trust" },
  }).catch(() => {});

  // Send security alert notification
  await createNotification({
    userId,
    tab: "activities",
    type: "SECURITY_ALERT",
    title: "Phone Verified",
    body: `Your mobile number (${canonicalPhone}) has been verified successfully.`,
    metadata: { phone: canonicalPhone },
  }).catch(() => {});

  console.log(
    `[Myaza Phone OTP] User ${userId} successfully verified phone ${canonicalPhone}`,
  );

  return {
    success: true,
    verified: true,
    phone: canonicalPhone,
    token: data.token,
  };
}

/**
 * Allows a user (especially international users outside Nigeria) to save their
 * phone number and skip SMS OTP verification, or skip the phone step for now.
 */
export async function skipPhoneVerification(params: {
  userId: string;
  phone?: string | null;
}): Promise<{
  success: boolean;
  skipped: boolean;
  phone: string | null;
}> {
  const { userId, phone } = params;
  await connectDB();

  const updateFields: Record<string, any> = {
    phoneSkipped: true,
  };

  const rawPhone = phone?.trim();
  if (rawPhone) {
    const cleaned = rawPhone.replace(/[^\d+]/g, "");
    if (cleaned.length >= 7) {
      updateFields.phoneNumber = cleaned;
      updateFields.phoneNumberVerified = false;
    }
  }

  await User.findByIdAndUpdate(userId, {
    $set: updateFields,
  });

  await recordUserActivity({
    userId,
    action: "PHONE_NUMBER_SKIPPED",
    details: {
      phone: updateFields.phoneNumber ?? null,
      reason: "skipped_or_international",
    },
  }).catch(() => {});

  console.log(
    `[Phone Verification] User ${userId} skipped phone verification. Phone: ${updateFields.phoneNumber ?? "none"}`,
  );

  return {
    success: true,
    skipped: true,
    phone: updateFields.phoneNumber ?? null,
  };
}

export const ALLOWED_KYC_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "video/webm",
  "video/mp4",
  "application/pdf",
] as const;

export type AllowedKycMimeType = (typeof ALLOWED_KYC_MIME_TYPES)[number];

/**
 * Inspects binary magic bytes, declared MIME type, and filename extension
 * to determine the canonical MIME type supported by KYC providers.
 */
export function detectAndNormalizeKycMimeType(
  buffer: Buffer,
  declaredType?: string,
  fileName?: string,
): string {
  // 1. Magic byte inspection
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).toString("ascii") === "%PDF"
  ) {
    return "application/pdf";
  }

  // 2. Normalized declared type
  const norm = (declaredType || "").toLowerCase().trim();
  if (norm === "image/jpg" || norm === "image/jpeg" || norm === "image/pjpeg") {
    return "image/jpeg";
  }
  if (norm === "image/png") return "image/png";
  if (norm === "application/pdf") return "application/pdf";
  if (norm === "video/mp4") return "video/mp4";
  if (norm === "video/webm") return "video/webm";

  // 3. File extension fallback
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";

  // Default fallback for camera/image captures
  return "image/jpeg";
}

/**
 * Resolves standard file extension for a given MIME type.
 */
export function getKycExtensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "jpeg";
  }
}

/**
 * Checks whether a user has completed and approved identity verification (KYC).
 */
export async function isUserKycVerified(userId: string): Promise<boolean> {
  const record = await getKycRecordByUserId(userId);
  if (!record) return false;
  return Boolean(
    record.isCompleted ||
      record.status === "approved" ||
      record.stage === "completed",
  );
}

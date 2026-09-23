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
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";
import { recordUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

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

  console.log(`[Myaza Phone OTP] Sending to ${canonicalPhone} via ${baseUrl}/contact/send`);

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

  console.log(`[Myaza Phone OTP] Dispatched challenge ${data.challengeId}, deliveryChannel: ${data.deliveryChannel}`);

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
    throw new Error("Missing verification challenge. Please request a new code.");
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

  console.log(`[Myaza Phone OTP] User ${userId} successfully verified phone ${canonicalPhone}`);

  return {
    success: true,
    verified: true,
    phone: canonicalPhone,
    token: data.token,
  };
}

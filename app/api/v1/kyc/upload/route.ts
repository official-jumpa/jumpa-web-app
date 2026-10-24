import { type NextRequest, NextResponse } from "next/server";
import {
  saveKycMedia,
  ALLOWED_KYC_MIME_TYPES,
  detectAndNormalizeKycMimeType,
  getKycExtensionForMime,
} from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import type { KycIdType } from "@/models/KYCSchema";
import {
  formatOneLineError,
  handleExternalApiError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

import { environment } from "@/lib/environment";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB max upload size
const UPLOAD_TIMEOUT_MS = 30000; // 30s timeout for media streaming

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "medium", action: "kyc_upload" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const apiKey =
      environment.MYAZA_TRUST_SECRET_KEY || environment.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = environment.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza] Missing API credentials");
      return NextResponse.json(
        { error: "Verification upload service is temporarily unavailable." },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") || "document_front");
    const idType = (formData.get("idType") as KycIdType) || null;
    const idNumber = formData.get("idNumber")
      ? String(formData.get("idNumber"))
      : null;

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid image file provided." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 3MB limit. Please upload a smaller image." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = typeof (file as any).name === "string" ? (file as any).name : "";
    const mimeType = detectAndNormalizeKycMimeType(buffer, file.type, originalName);

    if (!ALLOWED_KYC_MIME_TYPES.includes(mimeType as any)) {
      return NextResponse.json(
        { error: "Invalid format. Please upload an image in JPEG or PNG format." },
        { status: 400 },
      );
    }

    const extension = getKycExtensionForMime(mimeType);
    const safeFilename =
      originalName && originalName.includes(".")
        ? originalName.replace(/\.jpe?g$/i, ".jpeg")
        : `upload_${Date.now()}.${extension}`;

    const uploadBlob = new Blob([buffer], { type: mimeType });
    const myazaFormData = new FormData();
    myazaFormData.append("file", uploadBlob, safeFilename);
    myazaFormData.append("type", type);
    myazaFormData.append("mimeType", mimeType);

    console.log(
      `[Myaza] Uploading media for userId=${userId}: type=${type}, mimeType=${mimeType}, size=${file.size} bytes, filename=${safeFilename}`,
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: myazaFormData,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
    } catch (fetchErr: any) {
      const isTimeout = isTimeoutError(fetchErr);
      console.error(
        `[Myaza] ${isTimeout ? `Upload timed out after ${UPLOAD_TIMEOUT_MS}ms` : "Network failure"}:`,
        fetchErr,
      );
      return NextResponse.json(
        {
          error: isTimeout
            ? "Upload timed out. Please check your internet connection and try again."
            : "Unable to upload image. Please check your connection and retry.",
        },
        { status: isTimeout ? 504 : 502 },
      );
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = { error: "Failed to parse provider response" };
    }

    console.log(
      `[Myaza] response [HTTP ${response.status}]: ${formatOneLineError(data)}`,
    );

    if (!response.ok || !data?.mediaId) {
      let customError = "Failed to upload file. Please try again.";
      const rawErrorStr = String(data?.message || data?.error || "");

      if (rawErrorStr.includes("mimeType")) {
        customError = "Unsupported image format. Please upload a clear photo in JPEG or PNG format.";
      } else if (response.status >= 500) {
        customError = "The verification upload service is momentarily busy. Please try uploading again.";
      }

      return handleExternalApiError({
        provider: "Myaza",
        action: "upload",
        status: response.status,
        rawError: data,
        customMessage: customError,
      });
    }

    const normalizedType: "document_front" | "document_back" | "selfie" =
      type === "selfie"
        ? "selfie"
        : type === "document_back"
          ? "document_back"
          : "document_front";

    // Persist media ID to user's KYC record in MongoDB
    await saveKycMedia(userId, {
      type: normalizedType,
      mediaId: data.mediaId,
      idType,
      idNumber: idNumber ? idNumber.trim() : null,
    });

    logUserActivity({
      userId,
      action: "KYC_DOCUMENT_UPLOADED",
      details: {
        type: normalizedType,
        mediaId: data.mediaId,
        idType,
      },
      req,
    }).catch(() => {});

    // Minimal client-safe return: only confirmation and mediaId
    return NextResponse.json({
      success: true,
      mediaId: data.mediaId,
      type: data.type || type,
    });
  } catch (error: any) {
    return handleExternalApiError({
      provider: "Myaza",
      action: "upload",
      status: 500,
      rawError: error,
      customMessage: "An unexpected error occurred while uploading. Please try again.",
    });
  }
}

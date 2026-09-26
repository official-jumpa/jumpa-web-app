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

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB max upload size

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "medium", action: "kyc_upload" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const apiKey =
      process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = process.env.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza Upload] Error: Missing API Key or Base URL");
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
        { error: "No valid file provided" },
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
        {
          error:
            "Invalid file format. Please upload an image in JPEG, PNG, or PDF format",
        },
        { status: 400 },
      );
    }

    const extension = getKycExtensionForMime(mimeType);
    const safeFilename =
      originalName && originalName.includes(".")
        ? originalName.replace(/\.jpe?g$/i, ".jpeg")
        : `upload_${Date.now()}.${extension}`;

    let uploadBlob = new Blob([buffer], { type: mimeType });
    let uploadFilename = safeFilename;
    let uploadMimeType = mimeType;

    // Development Mode Fallback:
    // Substitute real user photos with public/logo.png so no private selfies/docs are sent to Myaza in dev
    if (process.env.NODE_ENV !== "production") {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        const logoBuffer = await fs.readFile(logoPath);
        uploadBlob = new Blob([logoBuffer], { type: "image/png" });
        uploadFilename = `test_logo_${type}.png`;
        uploadMimeType = "image/png";
        console.log(
          `[Myaza Upload DEV] Transparently substituting user photo with public/logo.png for dev testing (Type: ${type})`,
        );
      } catch (err) {
        console.warn(
          "[Myaza Upload DEV] Could not read public/logo.png, using provided upload:",
          err,
        );
      }
    }

    const myazaFormData = new FormData();
    myazaFormData.append("file", uploadBlob, uploadFilename);
    myazaFormData.append("type", type);
    myazaFormData.append("mimeType", uploadMimeType);

    console.log(
      `[Myaza Upload] Uploading file for user: ${userId} Type: ${type} Mime: ${uploadMimeType} Size: ${uploadBlob.size}`,
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: myazaFormData,
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchErr) {
      console.error("[Myaza Upload] Network/timeout exception:", fetchErr);
      return NextResponse.json(
        {
          error:
            "Upload connection timed out. Please check your internet connection and try again.",
        },
        { status: 504 },
      );
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = { error: "Failed to parse provider response" };
    }

    if (!response.ok || !data?.mediaId) {
      console.error("[Myaza Upload] Error from provider:", data);
      let errorMsg =
        data?.message || data?.error || "Failed to upload file. Please try again.";
      if (typeof errorMsg === "string" && errorMsg.includes("mimeType")) {
        errorMsg =
          "Unsupported image format. Please upload a clear photo in JPEG, PNG, or PDF format.";
      } else if (response.status >= 500) {
        errorMsg =
          "The verification upload service is momentarily busy. Please try uploading again.";
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: response.status >= 400 ? response.status : 500 },
      );
    }

    // Persist media ID to user's KYC record in MongoDB
    await saveKycMedia(userId, {
      type: type === "selfie" ? "selfie" : "document",
      mediaId: data.mediaId,
      idType,
      idNumber: idNumber ? idNumber.trim() : null,
    });

    logUserActivity({
      userId,
      action: "KYC_DOCUMENT_UPLOADED",
      details: {
        type: type === "selfie" ? "selfie" : "document",
        mediaId: data.mediaId,
        idType,
      },
      req,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      mediaId: data.mediaId,
      type: data.type || type,
    });
  } catch (error) {
    console.error("[Myaza Upload] Exception:", error);
    return NextResponse.json(
      { error: "Failed to upload file to Myaza" },
      { status: 500 },
    );
  }
}

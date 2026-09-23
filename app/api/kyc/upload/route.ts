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
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const apiKey =
      process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
    const baseUrl = process.env.MYAZA_TRUST_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.error("[Myaza Upload] Error: Missing API Key or Base URL");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
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

    const cleanBlob = new Blob([buffer], { type: mimeType });

    const myazaFormData = new FormData();
    myazaFormData.append("file", cleanBlob, safeFilename);
    myazaFormData.append("type", type);
    myazaFormData.append("mimeType", mimeType);

    console.log(
      `[Myaza Upload] Uploading file for user: ${userId} Type: ${type} Mime: ${mimeType} Size: ${file.size}`,
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: myazaFormData,
    });

    const data = await response.json();

    if (!response.ok || !data.mediaId) {
      console.error("[Myaza Upload] Error from provider:", data);
      let errorMsg =
        data.message || data.error || "Failed to upload file to Myaza";
      if (typeof errorMsg === "string" && errorMsg.includes("mimeType")) {
        errorMsg =
          "Unsupported image format. Please upload a clear photo in JPEG, PNG, or PDF format.";
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: response.status || 500 },
      );
    }

    // Persist media ID to user's KYC record in MongoDB
    await saveKycMedia(userId, {
      type: type === "selfie" ? "selfie" : "document",
      mediaId: data.mediaId,
      idType,
      idNumber,
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

import { type NextRequest, NextResponse } from "next/server";
import { saveKycMedia } from "@/lib/functions/kycFunctions";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import type { KycIdType } from "@/models/KYCSchema";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB max upload size

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const apiKey = process.env.MYAZA_TRUST_SECRET_KEY || process.env.MYAZA_TRUST_SANDBOX_KEY;
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

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No valid file provided" },
        { status: 400 },
      );
    }
    console.log("uploading image of size", file.size);

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 3MB limit. Please upload a smaller image." },
        { status: 400 },
      );
    }

    const myazaFormData = new FormData();
    myazaFormData.append("file", file);
    myazaFormData.append("type", type);

    console.log(
      `[Myaza Upload] Uploading file for user: ${userId} Type: ${type}`
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: myazaFormData,
    });

    const data = await response.json();

    if (!response.ok || !data.mediaId) {
      console.error("[Myaza Upload] Error from provider:", data);
      return NextResponse.json(
        {
          error: data.message || data.error || "Failed to upload file to Myaza",
        },
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

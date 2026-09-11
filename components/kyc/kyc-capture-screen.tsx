"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiInfo,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons/camera";

/** Rectangle for a document, dashed oval for a face. */
const FRAME = {
  box: "h-48 shrink-0 rounded-surface bg-jumpa-neutral-50 border border-jumpa-neutral-200",
  oval: "min-h-52 max-h-96 flex-1 rounded-[50%] border-2 border-dashed border-jumpa-neutral-200 bg-jumpa-neutral-50",
} as const;

interface TestScenario {
  code: string;
  label: string;
}

const TEST_SCENARIOS_BY_TYPE: Record<string, TestScenario[]> = {
  nin: [
    { code: "00000000001", label: "Approved" },
    { code: "00000000002", label: "Not Found" },
    { code: "00000000004", label: "Selfie Mismatch" },
  ],
  licence: [
    { code: "TST00000001", label: "Approved" },
    { code: "TST00000002", label: "Not Found" },
    { code: "TST00000007", label: "Expired" },
  ],
  passport: [
    { code: "A00000001", label: "Approved" },
    { code: "A00000002", label: "Not Found" },
    { code: "A00000007", label: "Expired" },
  ],
};

export function KycCaptureScreen({
  title,
  description,
  shape = "box",
  mode: initialMode = "upload",
  documentType,
  defaultIdNumber,
  initialMediaId,
  onDone,
}: {
  title: string;
  description: string;
  shape?: keyof typeof FRAME;
  mode?: "upload" | "camera";
  documentType?: string;
  defaultIdNumber?: string;
  initialMediaId?: string;
  onDone: (data: { file?: File; idNumber?: string; mediaId?: string }) => void;
}) {
  const mode = initialMode;
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [idNumber, setIdNumber] = useState(defaultIdNumber || "");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(
    initialMediaId || null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // When user picks or snaps a photo, show preview without auto-uploading
  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;

    // Reset upload state since this is a new image
    setUploadedMediaId(null);
    setUploadError(null);

    setSelectedFile(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  // Explicit user-triggered upload to Direct API
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", shape === "oval" ? "selfie" : "document_front");
      if (documentType) formData.append("idType", documentType);
      if (idNumber.trim()) formData.append("idNumber", idNumber.trim());

      const res = await fetch("/api/kyc/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { mediaId?: string; error?: string };
      if (res.ok && data.mediaId) {
        setUploadedMediaId(data.mediaId);
      } else {
        setUploadError(
          data.error || "Failed to upload file. Please try again.",
        );
      }
    } catch (_err) {
      setUploadError("Network connection error while uploading. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  // Complete step and proceed back to task checklist
  const handleContinue = () => {
    onDone({
      file: selectedFile || undefined,
      idNumber: idNumber.trim() || undefined,
      mediaId: uploadedMediaId || undefined,
    });
  };

  const camera = mode === "camera";
  const scenarios = documentType
    ? TEST_SCENARIOS_BY_TYPE[documentType] || []
    : [];

  return (
    <>
      <h1 className="mt-6 text-[26px] leading-8 font-bold text-jumpa-black">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-black">{description}</p>

      {/* Hidden File / Camera Input */}
      <input
        ref={field}
        type="file"
        accept="image/*"
        capture={
          camera ? (shape === "oval" ? "user" : "environment") : undefined
        }
        onChange={(event) => handleFilePicked(event.target.files?.[0])}
        className="sr-only"
      />

      {/* Image Preview & Capture Box */}
      <div className="relative mt-6">
        <button
          type="button"
          onClick={() => {
            if (!preview) {
              field.current?.click();
            }
          }}
          aria-label={preview ? "Photo preview" : "Choose a photo"}
          className={`w-full flex items-center justify-center overflow-hidden relative ${
            preview ? "cursor-default" : "cursor-pointer tap"
          } ${camera ? "mb-4" : ""} ${FRAME[shape]}`}>
          {preview ? (
            // biome-ignore lint/performance/noImgElement: dynamic blob URL preview
            <img
              src={preview}
              alt="Uploaded document or identity capture"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-jumpa-neutral-400 p-4 text-center">
              <CameraIcon className="size-8 text-jumpa-neutral-350" />
              <span className="text-xs font-medium">
                Tap to choose photo or open camera
              </span>
            </div>
          )}

          {/* Upload Status Overlay Pill */}
          {uploadedMediaId && !uploading && (
            <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
              <FiCheckCircle className="size-3.5" />
              <span>Uploaded</span>
            </div>
          )}
        </button>

        {/* Photo Actions: Replace Photo */}
        {preview && (
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => field.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer">
              <FiRefreshCw className="size-3 text-slate-600" />
              <span>Replace Photo</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload Notification Badge */}
      {uploadedMediaId && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <FiCheckCircle className="size-4 text-emerald-600 shrink-0" />
            <span>Photo uploaded successfully</span>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {uploadError}
        </div>
      )}

      {/* ID Number Input for Document Stage */}
      {/* remove the sandbox values after testing */}
      {documentType && (
        <div className="mt-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="idNumberInput"
              className="text-xs font-bold text-slate-800">
              Document / ID Number:
            </label>
          </div>
          <input
            id="idNumberInput"
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="e.g. 00000000001"
            className="w-full rounded-xl bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-jumpa-primary-500 focus:bg-white"
          />

          {scenarios.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold mb-1">
                <FiInfo className="size-3 text-amber-600" />
                <span>Sandbox Test Values:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((sc) => (
                  <button
                    key={sc.code}
                    type="button"
                    onClick={() => setIdNumber(sc.code)}
                    className={`text-[10.5px] font-mono px-2 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                      idNumber === sc.code
                        ? "bg-jumpa-primary-50 text-jumpa-primary-800 border-jumpa-primary-300 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}>
                    {sc.code} ({sc.label})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Dynamic Action Button */}
      <div className="mt-auto pt-4">
        {preview && !uploadedMediaId ? (
          // Photo is selected, but not yet uploaded
          <Button
            variant="gradient"
            size="lg"
            className="cursor-pointer font-bold"
            disabled={uploading}
            onClick={handleUpload}>
            {uploading ? (
              <span className="flex items-center gap-2">
                <FiRefreshCw className="size-5 animate-spin" />
                <span>Uploading...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FiUploadCloud className="size-5" />
                <span>Upload Photo</span>
              </span>
            )}
          </Button>
        ) : uploadedMediaId ? (
          // Photo has been successfully uploaded
          <Button
            variant="gradient"
            size="lg"
            className="cursor-pointer font-bold"
            onClick={handleContinue}>
            <span className="flex items-center gap-2">
              <span>Continue</span>
              <FiCheckCircle className="size-5" />
            </span>
          </Button>
        ) : (
          // No photo selected yet
          <Button
            variant="gradient"
            size="lg"
            className="cursor-pointer font-bold"
            onClick={() => field.current?.click()}>
            <span className="flex items-center gap-2">
              <CameraIcon className="size-5" />
              <span>{camera ? "Take Photo" : "Choose Photo"}</span>
            </span>
          </Button>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons/camera";

/** Rectangle for a document, dashed oval for a face. */
const FRAME = {
  box: "min-h-45 rounded-surface bg-jumpa-neutral-50",
  oval: "min-h-100 rounded-[50%] border-2 border-dashed border-jumpa-neutral-200 bg-jumpa-neutral-50",
} as const;

/**
 * Photo step of verification. `upload` offers the file picker with the camera
 * beside it; `camera` is the viewfinder state, where the CTA takes the shot.
 */
export function CaptureScreen({
  title,
  description,
  shape = "box",
  mode: initialMode = "upload",
  onDone,
}: {
  title: string;
  description: string;
  shape?: keyof typeof FRAME;
  mode?: "upload" | "camera";
  onDone: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [preview, setPreview] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const camera = mode === "camera";

  return (
    <>
      <h1 className="mt-6 text-[26px] leading-8 font-bold text-jumpa-black">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-black">{description}</p>

      <input
        ref={field}
        type="file"
        accept="image/*"
        capture={
          camera ? (shape === "oval" ? "user" : "environment") : undefined
        }
        onChange={(event) => pick(event.target.files?.[0])}
        className="sr-only"
      />

      <button
        type="button"
        onClick={() => field.current?.click()}
        aria-label={preview ? "Replace photo" : "Choose a photo"}
        className={`tap mt-6 flex flex-1 items-center justify-center overflow-hidden ${FRAME[shape]}`}
      >
        {preview ? (
          // biome-ignore lint/performance/noImgElement: a blob URL cannot go through next/image
          <img
            src={preview}
            alt="Your upload"
            className="size-full object-cover"
          />
        ) : null}
      </button>

      {camera ? null : (
        <>
          <p className="mt-6 flex items-center gap-3 text-xs leading-4 text-jumpa-neutral-350">
            <span className="h-px flex-1 bg-jumpa-neutral-100" />
            Or Continue to
            <span className="h-px flex-1 bg-jumpa-neutral-100" />
          </p>

          <button
            type="button"
            onClick={() => setMode("camera")}
            className="tap mt-6 flex h-12 items-center justify-center gap-2 self-center rounded-pill bg-jumpa-primary-50 px-6 text-sm leading-4 font-medium text-jumpa-primary-600 active:scale-[0.98]"
          >
            <CameraIcon aria-hidden="true" className="size-6" />
            Open Camera and Take Photo
          </button>
        </>
      )}

      {/* Never dead: with no photo yet the CTA opens the picker instead. */}
      <Button
        variant="gradient"
        size="lg"
        className="mt-auto"
        onClick={() => (preview ? onDone() : field.current?.click())}
      >
        {preview ? "Continue" : camera ? "Capture and Continue" : "Add photo"}
      </Button>
    </>
  );
}

"use client";

import type { ComponentType, SVGProps } from "react";
import { useEffect } from "react";
import { CameraIcon } from "@/components/ui/icons/camera";
import { FileIcon } from "@/components/ui/icons/file";
import { ImageIcon } from "@/components/ui/icons/image";

/** Which hidden input the chosen row opens. */
export type AttachmentSource = "image" | "file" | "camera";

const OPTIONS: {
  id: AttachmentSource;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
}[] = [
  { id: "camera", Icon: CameraIcon, title: "Camera" },
  { id: "image", Icon: ImageIcon, title: "Photos" },
  { id: "file", Icon: FileIcon, title: "Files" },
];

/**
 * What the composer's + opens. A small menu anchored above the button rather
 * than a bottom sheet — picking a file is a minor action and should not take
 * the screen. The scrim is invisible: it only exists to catch the next tap.
 */
export function AttachmentMenu({
  onPick,
  onClose,
}: {
  onPick: (source: AttachmentSource) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close attachment menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />

      <div
        // bottom-full: sits on the button, so it never covers the transcript.
        className="absolute bottom-full left-0 z-50 mb-2 w-44 origin-bottom-left animate-pop-in rounded-dock bg-jumpa-white p-1.5 shadow-jumpa-elevated ring-1 ring-jumpa-neutral-90"
      >
        <ul className="flex flex-col">
          {OPTIONS.map(({ id, Icon, title }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPick(id)}
                className="tap flex w-full items-center gap-2.5 rounded-surface px-2 py-2 text-left active:scale-[0.98] hover:bg-jumpa-neutral-50"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jumpa-neutral-50">
                  <Icon className="size-4.5 text-jumpa-primary-600" />
                </span>
                <span className="text-sm font-medium text-jumpa-black">
                  {title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

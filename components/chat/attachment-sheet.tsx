"use client";

import type { ComponentType, SVGProps } from "react";
import { CameraIcon } from "@/components/ui/icons/camera";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FileIcon } from "@/components/ui/icons/file";
import { ImageIcon } from "@/components/ui/icons/image";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Which hidden input the chosen row opens. */
export type AttachmentSource = "image" | "file" | "camera";

const OPTIONS: {
  id: AttachmentSource;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
}[] = [
  { id: "image", Icon: ImageIcon, title: "Image" },
  { id: "file", Icon: FileIcon, title: "File" },
  { id: "camera", Icon: CameraIcon, title: "Camera" },
];

/** What the composer's + opens: the three ways a file gets into the chat. */
export function AttachmentSheet({
  onPick,
  onClose,
}: {
  onPick: (source: AttachmentSource) => void;
  onClose: () => void;
}) {
  return (
    <SheetPortal onClose={onClose}>
      {/* pt-3 tops the handle's own mb-3 up to the app's 24px sheet gap. */}
      <div className="flex flex-col items-center gap-4 pt-3">
        <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
          Add to chat
        </h2>

        <ul className="flex w-full flex-col gap-2">
          {OPTIONS.map(({ id, Icon, title }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPick(id)}
                className="tap flex w-full items-center justify-between gap-2 rounded-lg bg-jumpa-neutral-50 px-3 py-4 active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
                  <span className="text-sm font-medium text-jumpa-black">
                    {title}
                  </span>
                </span>
                <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SheetPortal>
  );
}

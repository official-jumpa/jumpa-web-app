"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/ui/sheet-portal";

function Option({
  icon,
  title,
  caption,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 py-2 text-left tap"
    >
      {icon}
      <span className="flex flex-col gap-1 leading-none tracking-jumpa-snug">
        <span className="text-base font-medium text-jumpa-ink">{title}</span>
        <span className="text-[13px] text-jumpa-ink-muted">{caption}</span>
      </span>
    </button>
  );
}

function Disc({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-11.5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50">
      {children}
    </span>
  );
}

/** Take, pick or remove the profile photo. Remove only shows when there is one. */
export function ProfilePhotoSheet({
  canRemove,
  onCamera,
  onGallery,
  onRemove,
  onClose,
}: {
  canRemove: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <SheetPortal look="account" onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        <h2 className="text-[22px] leading-[1.1] font-bold tracking-jumpa-snug text-jumpa-ink">
          Profile photo
        </h2>
        <Option
          icon={
            <Image
              src="/images/profile-photo/take-photo.svg"
              alt=""
              width={46}
              height={46}
              className="shrink-0"
            />
          }
          title="Take a photo"
          caption="Use your camera"
          onClick={onCamera}
        />
        <Option
          icon={
            <Disc>
              <Image
                src="/images/profile-photo/gallery.svg"
                alt=""
                width={20}
                height={20}
              />
            </Disc>
          }
          title="Choose from gallery"
          caption="Pick one you already have"
          onClick={onGallery}
        />
        {canRemove ? (
          <Option
            icon={
              <Disc>
                <Image
                  src="/images/profile-photo/remove-photo.svg"
                  alt=""
                  width={24}
                  height={24}
                />
              </Disc>
            }
            title="Remove current photo"
            caption="Go back to your initials"
            onClick={onRemove}
          />
        ) : null}
        <Button variant="outline" size="sheet" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </SheetPortal>
  );
}

"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { CopyIcon } from "@/components/ui/icons/copy";
import { DownloadIcon } from "@/components/ui/icons/download";
import { ShareArrowIcon } from "@/components/ui/icons/share-arrow";
import { WhatsappIcon } from "@/components/ui/icons/whatsapp";
import { XLogoIcon } from "@/components/ui/icons/x-logo";
import type { MomentImage } from "@/hooks/use-moment-image";
import { track } from "@/lib/analytics";
import { canShareFiles, downloadBlob } from "@/lib/receipt";
import type { MomentCard } from "@/lib/savings-moments";
import { momentFilename } from "@/lib/share-card";

type Channel = "native" | "whatsapp" | "x" | "save" | "copy";

const ROUND =
  "tap flex size-12 shrink-0 items-center justify-center rounded-full bg-jumpa-neutral-50 text-jumpa-primary-950 inset-ring-1 inset-ring-jumpa-neutral-100 active:scale-95 disabled:opacity-40";

/**
 * Where a card can go. The OS sheet carries the image itself, which is how it
 * reaches Instagram Stories (there is no web intent for it); WhatsApp and X
 * take the caption and link, which works on desktop too.
 */
export function ShareActions({
  card,
  image,
}: {
  card: MomentCard;
  image: MomentImage;
}) {
  const [copied, setCopied] = useState(false);
  const native = canShareFiles();
  const ready = image.status === "ready";

  const shared = (channel: Channel) =>
    track("savings_card_shared", { moment: card.label, channel });

  const save = () => {
    if (!image.blob) return;
    downloadBlob(image.blob, momentFilename(card));
    shared("save");
  };

  const shareNative = async () => {
    if (!image.blob) return;
    const file = new File([image.blob], momentFilename(card), {
      type: image.blob.type,
    });
    if (!navigator.canShare({ files: [file] })) {
      save();
      return;
    }
    try {
      await navigator.share({ files: [file], text: card.caption });
      shared("native");
    } catch (error) {
      // Closing the sheet is a choice, not a failure.
      if ((error as DOMException).name !== "AbortError") save();
    }
  };

  const open = (channel: "whatsapp" | "x") => {
    const text = encodeURIComponent(card.caption);
    const url =
      channel === "whatsapp"
        ? `https://wa.me/?text=${text}`
        : `https://x.com/intent/post?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    shared(channel);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(card.caption);
      setCopied(true);
      shared("copy");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard writes are blocked in some browsers; the intents still work.
    }
  };

  return (
    <div className="flex w-full items-center gap-2.5">
      <button
        type="button"
        onClick={native ? shareNative : save}
        disabled={!ready}
        className="tap flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-pill bg-[image:var(--gradient-jumpa-cta)] text-sm font-semibold text-jumpa-alt-50 active:scale-[0.98] disabled:opacity-60"
      >
        {native ? (
          <ShareArrowIcon className="size-5" />
        ) : (
          <DownloadIcon className="size-5" />
        )}
        {native ? "Share card" : "Save image"}
      </button>

      <button
        type="button"
        aria-label="Share on WhatsApp"
        onClick={() => open("whatsapp")}
        className={ROUND}
      >
        <WhatsappIcon className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Share on X"
        onClick={() => open("x")}
        className={ROUND}
      >
        <XLogoIcon className="size-4.5" />
      </button>
      {native ? (
        <button
          type="button"
          aria-label="Save image"
          onClick={save}
          disabled={!ready}
          className={ROUND}
        >
          <DownloadIcon className="size-5.5" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={copied ? "Caption copied" : "Copy caption"}
          onClick={copy}
          className={ROUND}
        >
          {copied ? (
            <CheckIcon className="size-5 text-jumpa-primary-600" />
          ) : (
            <CopyIcon className="size-5" />
          )}
        </button>
      )}
    </div>
  );
}

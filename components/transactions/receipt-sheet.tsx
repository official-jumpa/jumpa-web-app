"use client";

import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";
import {
  RECEIVE_ROW,
  RECEIVE_ROW_PICKED,
  RECEIVE_ROW_RESTING,
} from "@/components/transfer/receive-options";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { FileIcon } from "@/components/ui/icons/file";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import { ImageIcon } from "@/components/ui/icons/image";
import { SheetPortal } from "@/components/ui/sheet-portal";
import {
  buildReceipt,
  downloadBlob,
  type Receipt,
  type ReceiptFormat,
  receiptFile,
  receiptFilename,
  shareFile,
} from "@/lib/receipt";

type Row = {
  id: ReceiptFormat;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  caption: string;
};

const FORMATS: Row[] = [
  {
    id: "png",
    Icon: ImageIcon,
    title: "Image",
    caption: "A PNG you can send in any chat",
  },
  {
    id: "pdf",
    Icon: FileIcon,
    title: "PDF document",
    caption: "Print-ready, opens anywhere",
  },
  // {
  //   id: "csv",
  //   Icon: FileArrowDownAltIcon,
  //   title: "Spreadsheet",
  //   caption: "CSV for your records or accountant",
  // },
];

/**
 * Format chooser for a transaction receipt, to download or to share. Picking
 * a row marks it, the CTA acts on the choice, and the sheet closes once done.
 * Everything is built in the browser, so nothing leaves the device until the
 * user shares it.
 */
export function ReceiptSheet({
  receipt,
  onClose,
  mode = "download",
}: {
  receipt: Receipt;
  onClose: () => void;
  mode?: "download" | "share";
}) {
  const sharing = mode === "share";
  const [picked, setPicked] = useState<ReceiptFormat>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // iOS opens the share sheet only straight off a tap, so the file is built on pick.
  const [ready, setReady] = useState<{ format: ReceiptFormat; file: File }>();

  const pick = (format: ReceiptFormat) => {
    setPicked(format);
    setError(undefined);
    if (!sharing) return;
    receiptFile(receipt, format)
      .then((file) => setReady({ format, file }))
      .catch(() => setReady(undefined));
  };
  const act = async () => {
    if (busy) return;
    if (!picked) {
      setError(`Pick a format to ${sharing ? "share" : "download"}`);
      return;
    }

    setBusy(true);
    setError(undefined);

    try {
      if (sharing) {
        const file =
          ready?.format === picked
            ? ready.file
            : await receiptFile(receipt, picked);
        // Without a share sheet the file is saved instead.
        if (!(await shareFile(file))) downloadBlob(file, file.name);
      } else {
        const blob = await buildReceipt(receipt, picked);
        downloadBlob(blob, receiptFilename(receipt, picked));
      }

      onClose();
    } catch (cause) {
      // Dismissing the share sheet is not a failure.
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      // The reason is for us; the user gets something they can act on.
      console.error("[ReceiptSheet] Could not build the receipt:", cause);
      setError(
        sharing
          ? "Could not open the share sheet. Try again or download it."
          : "That receipt could not be built. Try another format.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetPortal onClose={onClose} className="pb-7.5">
      <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
        {sharing ? "Share Receipt" : "Download Receipt"}
      </h2>

      {/* A miniature of what gets exported, so the choice has a subject. */}
      <div className="mt-4 flex flex-col items-center gap-1 rounded-chip bg-jumpa-neutral-50 px-4 py-5">
        <Image
          src="/logo/wordmark/purple.png"
          alt="Jumpa"
          width={384}
          height={80}
          className="mb-2 w-16"
        />
        <span className="text-2xl leading-7 font-semibold text-jumpa-black">
          {receipt.amount}
        </span>
        <span className="text-sm leading-4.5 font-medium text-jumpa-black">
          {receipt.title}
        </span>
        <span className="text-[10px] leading-3.5 text-jumpa-neutral-400">
          {receipt.timestamp}
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {FORMATS.map(({ id, Icon, title, caption }) => {
          const selected = picked === id;

          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => pick(id)}
                className={`${RECEIVE_ROW} ${
                  selected ? RECEIVE_ROW_PICKED : RECEIVE_ROW_RESTING
                }`}
              >
                <span className="flex items-center gap-2 text-left">
                  <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-jumpa-black">
                      {title}
                    </span>
                    <span className="text-[10px] leading-3.5 text-jumpa-neutral-400">
                      {caption}
                    </span>
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? "bg-jumpa-primary-600 text-jumpa-white"
                      : "inset-ring-1 inset-ring-jumpa-neutral-100"
                  }`}
                >
                  {selected ? <CheckIcon className="size-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-[10px] leading-3.5 text-jumpa-neutral-350">
        Nothing leaves your device. The receipt is built here.
      </p>

      <div className="mt-2 flex flex-col gap-4">
        <FieldError>{error}</FieldError>

        <Button variant="gradientSheet" size="lg" onClick={act}>
          {busy ? "Preparing…" : sharing ? "Share receipt" : "Download receipt"}
        </Button>
      </div>
    </SheetPortal>
  );
}

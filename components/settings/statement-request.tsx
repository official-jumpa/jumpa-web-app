"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { settingsHref } from "@/components/settings/sections";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { DownloadIcon } from "@/components/ui/icons/download";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { cn } from "@/lib/cn";
import { STATEMENT_DURATIONS, type StatementDuration } from "@/lib/statements";

const CHIP =
  "tap flex items-center justify-center rounded-pill p-2.5 text-[10px] leading-3 font-medium active:scale-[0.98]";
const CHIP_ON = "bg-jumpa-primary-50 text-jumpa-primary-600";
const CHIP_OFF = "bg-jumpa-neutral-50 text-jumpa-primary-950";

const FORMATS = [
  { id: "pdf", label: "Download History (PDF)", icon: DownloadIcon },
  { id: "csv", label: "Download History (CSV)", icon: FileArrowDownAltIcon },
] as const;

type Format = (typeof FORMATS)[number]["id"];

/**
 * "Request Account Statements", raised over Settings as the design draws it.
 * Pick a range, pick a format, confirm.
 */
export function StatementRequestSheet({ onClose }: { onClose: () => void }) {
  const [duration, setDuration] = useState<StatementDuration>("all");
  const [format, setFormat] = useState<Format>("pdf");
  const [requested, setRequested] = useState(false);

  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-xs leading-3.5 font-medium text-jumpa-black">
            Duration
          </h2>
          <div className="flex flex-wrap items-center gap-1">
            {STATEMENT_DURATIONS.map((option) =>
              // A custom range is the statement screens' whole job, so the
              // chip hands over to them rather than opening a second picker.
              option.id === "custom" ? (
                <Link
                  key={option.id}
                  href={settingsHref("statements")}
                  className={cn(CHIP, CHIP_OFF)}
                >
                  {option.label}
                </Link>
              ) : (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={duration === option.id}
                  onClick={() => {
                    setDuration(option.id);
                    setRequested(false);
                  }}
                  className={cn(
                    CHIP,
                    duration === option.id ? CHIP_ON : CHIP_OFF,
                  )}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        <SettingCard>
          {FORMATS.map(({ id, label, icon: Icon }, index) => (
            <Fragment key={id}>
              {index > 0 ? <SettingRule /> : null}
              <button
                type="button"
                aria-pressed={format === id}
                onClick={() => {
                  setFormat(id);
                  setRequested(false);
                }}
                className="tap flex items-center justify-between gap-3 active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    className={cn(
                      "size-6 shrink-0",
                      format === id
                        ? "text-jumpa-primary-600"
                        : "text-jumpa-primary-950",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-xs leading-3.5",
                      format === id
                        ? "font-medium text-jumpa-primary-600"
                        : "text-jumpa-black",
                    )}
                  >
                    {label}
                  </span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
              </button>
            </Fragment>
          ))}
        </SettingCard>

        <Button
          variant="gradientSheet"
          size="lg"
          onClick={() => setRequested(true)}
        >
          Yes, Continue
        </Button>

        {requested ? (
          <output className="text-center text-xs leading-4 font-medium text-jumpa-success">
            Your {format.toUpperCase()} statement is being prepared. We&rsquo;ll
            email it when it&rsquo;s ready.
          </output>
        ) : null}
      </div>
    </SheetPortal>
  );
}

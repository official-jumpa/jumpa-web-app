"use client";

import { type ComponentType, type SVGProps, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { RefreshIcon } from "@/components/ui/icons/refresh";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { RingedButton } from "@/components/ui/ringed-button";
import { KYC_TASKS, type KycDocument, type KycTask } from "@/lib/kyc";

const ICONS: Record<KycTask, ComponentType<SVGProps<SVGSVGElement>>> = {
  document: IdCardIcon,
  selfie: FaceIdIcon,
};

export function KycTasks({
  done,
  document,
  idNumber,
  hasSelfie,
  isSubmitting,
  isPendingVerification,
  apiError,
  onPick,
  onContinue,
  onCheckStatus,
}: {
  done: readonly KycTask[];
  document: KycDocument;
  idNumber?: string;
  hasSelfie?: boolean;
  isSubmitting?: boolean;
  isPendingVerification?: boolean;
  apiError?: string | null;
  onPick: (task: KycTask) => void;
  onContinue: () => void;
  onCheckStatus?: () => void;
}) {
  const [error, setError] = useState<string>();
  const hasDoc = done.includes("document");
  const hasSelfieTask = done.includes("selfie");

  const handleCtaClick = () => {
    setError(undefined);
    if (isPendingVerification) {
      onCheckStatus?.();
      return;
    }
    if (!hasDoc) {
      onPick("document");
    } else if (!hasSelfieTask) {
      onPick("selfie");
    } else {
      onContinue();
    }
  };

  const ctaLabel = isSubmitting
    ? "Verifying..."
    : isPendingVerification
      ? "Verification in Progress..."
      : !hasDoc
        ? "Upload ID Document"
        : !hasSelfieTask
          ? "Take Live Selfie"
          : "Submit for Verification";

  return (
    <>
      <h1 className="mt-8 text-[26px] leading-8 font-bold text-jumpa-black">
        Verify your identity
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      {/* Verification In Progress Card */}
      {isPendingVerification && (
        <div className="mt-5 flex flex-col gap-2.5 rounded-card border border-jumpa-warning/25 bg-jumpa-warning-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-white text-jumpa-warning">
              <RefreshIcon aria-hidden="true" className="size-4.5 animate-spin" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-4.5 font-semibold text-jumpa-black">
                Verification in progress
              </span>
              <span className="text-xs leading-4 text-jumpa-neutral-500">
                Your documents are being verified. We will let you know as soon
                as it is done.
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-jumpa-warning/20 pt-2.5 text-[11px] leading-4 text-jumpa-neutral-500">
            <span className="flex items-center gap-1.5">
              {/* Opacity and transform only, so the row never reflows. */}
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-jumpa-warning opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-jumpa-warning" />
              </span>
              Checking status
            </span>
            {onCheckStatus && (
              <button
                type="button"
                onClick={onCheckStatus}
                className="tap font-semibold text-jumpa-warning underline active:scale-95"
              >
                Refresh now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checklist of Tasks */}
      <ul className="mt-6 flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4 border border-jumpa-primary-100">
        {KYC_TASKS.map((task, index) => {
          const Icon = ICONS[task.id];
          const ticked = done.includes(task.id);
          const detail =
            task.id === "document" && ticked
              ? `${document.label}${idNumber ? ` (${idNumber})` : ""}`
              : task.id === "selfie" && hasSelfie
                ? "Live selfie captured"
                : task.description;

          return (
            <li key={task.id} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setError(undefined);
                  onPick(task.id);
                }}
                className="tap flex w-full items-center gap-3 text-left active:scale-[0.99] cursor-pointer">
                <Icon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-jumpa-primary-600"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm leading-4.5 font-semibold text-jumpa-black flex items-center gap-2">
                    <span>{task.title}</span>
                    {ticked && (
                      <span className="rounded-chip bg-jumpa-success/10 px-1.5 py-0.5 text-[10px] leading-3.5 font-semibold text-jumpa-success">
                        Done
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-4.5 text-jumpa-neutral-400">
                    {detail}
                  </span>
                </span>
                {ticked ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white">
                    <CheckIcon className="size-3.5" />
                  </span>
                ) : (
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-jumpa-black"
                  />
                )}
              </button>
              {index < KYC_TASKS.length - 1 ? (
                <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* API Error alert if present */}
      {apiError && (
        <div className="mt-4 flex items-start gap-2 rounded-panel bg-jumpa-danger-50 px-3 py-2.5 text-jumpa-danger">
          <SealAlertIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs leading-4 font-semibold">
              Verification error
            </span>
            <span className="text-[11px] leading-4">{apiError}</span>
          </span>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3 pt-10">
        <FieldError>{error}</FieldError>
        <RingedButton onClick={handleCtaClick} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <RefreshIcon aria-hidden="true" className="size-4 animate-spin" />
              Verifying
            </span>
          ) : (
            ctaLabel
          )}
        </RingedButton>
      </div>
    </>
  );
}

export const ApiKycTasks = KycTasks;

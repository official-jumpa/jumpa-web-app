"use client";

import { type ComponentType, type SVGProps, useState } from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { IdCardIcon } from "@/components/ui/icons/id-card";
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
        <div className="mt-5 rounded-2xl bg-amber-50/90 border border-amber-200 p-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <FiRefreshCw className="size-4.5 text-amber-700 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Verification in Progress
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Your documents are being verified. We will update you when the verification is complete
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px] text-amber-800">
            <span className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
              </span>
              <span>Checking status...</span>
            </span>
            {onCheckStatus && (
              <button
                type="button"
                onClick={onCheckStatus}
                className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer">
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
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
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
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <FiAlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-bold block">Verification Error:</span>
            <span className="text-[11px] leading-relaxed">{apiError}</span>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3 pt-10">
        <FieldError>{error}</FieldError>
        <RingedButton onClick={handleCtaClick} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <FiRefreshCw className="size-4 animate-spin" />
              Verifying...
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

import { type ComponentType, type SVGProps, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { RingedButton } from "@/components/ui/ringed-button";
import { KYC_TASKS, type KycTask } from "@/lib/kyc";

const ICONS: Record<KycTask, ComponentType<SVGProps<SVGSVGElement>>> = {
  document: IdCardIcon,
  selfie: FaceIdIcon,
};

/** The two captures, ticked off as they are taken. */
export function KycTasks({
  done,
  onPick,
  onContinue,
}: {
  done: readonly KycTask[];
  onPick: (task: KycTask) => void;
  onContinue: () => void;
}) {
  const [error, setError] = useState<string>();
  const complete = done.length === KYC_TASKS.length;

  const submit = () => {
    if (complete) return onContinue();
    const left = KYC_TASKS.filter((task) => !done.includes(task.id));
    setError(
      left.length === KYC_TASKS.length
        ? "Complete both steps above to continue."
        : `One step left: ${left[0].title.toLowerCase()}.`,
    );
  };

  return (
    <>
      <h1 className="mt-8 text-[26px] leading-8 font-bold text-jumpa-black">
        Verify your identity
      </h1>
      <p className="mt-2 text-sm leading-5 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      <ul className="mt-6 flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
        {KYC_TASKS.map((task, index) => {
          const Icon = ICONS[task.id];
          const ticked = done.includes(task.id);
          return (
            <li key={task.id} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setError(undefined);
                  onPick(task.id);
                }}
                className="tap flex w-full items-center gap-3 text-left active:scale-[0.99]"
              >
                <Icon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-jumpa-primary-600"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm leading-4.5 font-semibold text-jumpa-black">
                    {task.title}
                  </span>
                  <span className="text-xs leading-4.5 text-jumpa-neutral-400">
                    {task.description}
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

      <div className="mt-auto flex flex-col items-center gap-3 pt-10">
        <FieldError>{error}</FieldError>
        <RingedButton onClick={submit}>Continue to verification</RingedButton>
      </div>
    </>
  );
}

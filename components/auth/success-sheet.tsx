import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";

/** Bottom sheet over a scrim. The caller decides when it is on screen. */
export function SuccessSheet({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-10 flex justify-center bg-jumpa-black/55">
      <div className="flex w-full max-w-app flex-col justify-end px-2.5 pb-[calc(11px+env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-6 rounded-sheet bg-jumpa-white px-4.25 py-4">
          <span className="h-1.5 w-30 rounded-pill bg-jumpa-neutral-75" />

          <div className="flex w-full flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-6">
              <Image
                src="/images/auth/verification-success.svg"
                alt=""
                width={126}
                height={94}
              />
              <div className="flex flex-col items-center gap-2.5">
                <h2 className="text-center text-2xl leading-6.5 font-medium text-jumpa-black">
                  {title}
                </h2>
                <span className="h-px w-full bg-jumpa-neutral-100" />
                <p className="flex items-center gap-2 text-xs leading-3.5 text-jumpa-black">
                  <PartyBellIcon className="size-6 shrink-0 text-jumpa-black" />
                  <span>{description}</span>
                </p>
              </div>
            </div>

            <Button
              href={actionHref}
              variant="gradientSheet"
              size="lg"
              className="max-w-[330px]"
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

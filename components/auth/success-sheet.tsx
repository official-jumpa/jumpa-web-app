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
    <div className="fixed inset-0 z-30 flex animate-fade items-end justify-center bg-jumpa-black/45">
      <div className="relative w-full max-w-app animate-sheet-up rounded-t-[32px] rounded-b-none bg-jumpa-white px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl">
        <div className="flex flex-col items-center gap-6">
          <span className="block h-1 w-25 rounded-full bg-jumpa-neutral-75" />

          <div className="flex w-full flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-6">
              <Image
                src="/images/auth/verification_success.svg"
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
